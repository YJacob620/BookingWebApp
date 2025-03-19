import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GripVertical, Trash2, Edit, Plus, Save } from 'lucide-react';

// Import DND Kit components
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Import API functions
import {
    fetchInfrastructureQuestions,
    saveInfrastructureQuestion,
    deleteInfrastructureQuestion,
    updateQuestionsOrder,
    FilterQuestionData
} from '@/_utils';

// Define question types
const QuestionTypes = [
    { id: 'text', label: 'Free Text' },
    { id: 'number', label: 'Number' },
    { id: 'dropdown', label: 'Dropdown' },
    { id: 'document', label: 'Document Upload' }
];

// Component for a sortable question item
const SortableQuestionItem = ({ question, onEdit, onDelete }: {
    question: FilterQuestionData; onEdit: (id: number) => void; onDelete: (id: number) => void;
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: question.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="mb-4 p-4 border border-gray-700 rounded-md bg-gray-800"
        >
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <div className="flex items-center">
                        <div
                            {...attributes}
                            {...listeners}
                            className="cursor-grab mr-2 p-1 rounded hover:bg-gray-700"
                        >
                            <GripVertical className="h-5 w-5 text-gray-400" />
                        </div>

                        <div>
                            <h3 className="text-lg font-medium">{question.question_text}</h3>
                            <div className="flex items-center mt-1 text-sm text-gray-400">
                                <span className="mr-4">Type: {question.question_type}</span>
                                {question.is_required == true && (
                                    <span className="text-red-400">Required</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {question.question_type === 'dropdown' && question.options && (
                        <div className="mt-2 pl-8">
                            <p className="text-sm text-gray-400 mb-1">Options:</p>
                            <ul className="list-disc pl-5 text-sm text-gray-300">
                                {question.options.split('\n').map((option, i) => (
                                    <li key={i}>{option}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="flex">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(question.id)}
                        className="mr-1 text-blue-400"
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(question.id)}
                        className="text-red-400"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

// Main component
interface InfrastructureQuestionsManagerProps {
    infrastructureId: number;
}

const InfrastructureQuestionsManager: React.FC<InfrastructureQuestionsManagerProps> = ({
    infrastructureId
}) => {
    const [questions, setQuestions] = useState<FilterQuestionData[]>([]);
    const [newQuestion, setNewQuestion] = useState({
        question_text: '',
        question_type: 'text' as 'text' | 'number' | 'dropdown' | 'document',
        is_required: true,
        options: ''
    });
    const [editingQuestion, setEditingQuestion] = useState<FilterQuestionData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Setup DND Kit sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Load questions on component mount and when infrastructureId changes
    useEffect(() => {
        if (infrastructureId) {
            loadQuestions();
        }
    }, [infrastructureId]);

    // Load questions from API
    const loadQuestions = async () => {
        if (!infrastructureId) return;

        try {
            setIsLoading(true);
            setErrorMessage(null);

            const data = await fetchInfrastructureQuestions(infrastructureId);
            // Sort by display_order
            setQuestions(data.sort((a: FilterQuestionData, b: FilterQuestionData) => a.display_order - b.display_order));
        } catch (error) {
            console.error('Error loading questions:', error);
            setErrorMessage('Failed to load questions. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle drag end event for reordering
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            // Find the indices of the dragged and target items
            const oldIndex = questions.findIndex(q => q.id === active.id);
            const newIndex = questions.findIndex(q => q.id === over.id);

            // Reorder the questions array
            const newQuestions = arrayMove(questions, oldIndex, newIndex);

            // Update the display_order values
            const updatedQuestions = newQuestions.map((question, index) => ({
                ...question,
                display_order: index
            }));

            // Update the state
            setQuestions(updatedQuestions);

            // Save the new order to the server
            try {
                const orderData = updatedQuestions.map(q => ({
                    id: q.id,
                    display_order: q.display_order
                }));

                await updateQuestionsOrder(infrastructureId, orderData);

                showSuccess('Question order updated successfully');
            } catch (error) {
                console.error('Error updating question order:', error);
                setErrorMessage('Failed to update question order on the server');
                // Reload the questions to get the original order
                loadQuestions();
            }
        }
    };

    // Handle adding a new question
    const handleAddQuestion = async () => {
        if (!newQuestion.question_text.trim()) {
            setErrorMessage('Question text is required');
            return;
        }

        // Ensure infrastructureId is a valid number
        if (!infrastructureId || isNaN(infrastructureId)) {
            setErrorMessage('Invalid infrastructure ID');
            return;
        }

        try {
            // Calculate the next display order (add to the end)
            const displayOrder = questions.length > 0
                ? Math.max(...questions.map(q => q.display_order)) + 1
                : 0;

            const questionData: FilterQuestionData = {
                id: -1, // set id to -1 to indicate it's a new question
                infrastructure_id: infrastructureId,
                question_text: newQuestion.question_text,
                question_type: newQuestion.question_type,
                is_required: newQuestion.is_required,
                options: newQuestion.question_type === 'dropdown' ? newQuestion.options : '',
                display_order: displayOrder
            };

            await saveInfrastructureQuestion(questionData);

            // Reset form
            setNewQuestion({
                question_text: '',
                question_type: 'text',
                is_required: true,
                options: ''
            });

            // Reload questions
            loadQuestions();
            showSuccess('Question added successfully');
        } catch (error) {
            console.error('Error adding question:', error);
            setErrorMessage('Failed to add question. Please try again.');
        }
    };

    // Handle editing a question
    const handleEditQuestion = (id: number) => {
        const question = questions.find(q => q.id === id);
        if (question) {
            setEditingQuestion({
                ...question,
                options: question.options || ''
            });
        }
    };

    // Handle updating a question
    const handleUpdateQuestion = async () => {
        if (!editingQuestion) return;

        if (!editingQuestion.question_text.trim()) {
            setErrorMessage('Question text is required');
            return;
        }

        try {
            await saveInfrastructureQuestion({
                ...editingQuestion,
                options: editingQuestion.question_type === 'dropdown' ? editingQuestion.options ?? undefined : ''
            });

            setEditingQuestion(null);
            loadQuestions();
            showSuccess('Question updated successfully');
        } catch (error) {
            console.error('Error updating question:', error);
            setErrorMessage('Failed to update question. Please try again.');
        }
    };

    // Handle deleting a question
    const handleDeleteQuestion = async (id: number) => {
        if (!confirm('Are you sure you want to delete this question?')) {
            return;
        }

        try {
            await deleteInfrastructureQuestion(infrastructureId, id);
            loadQuestions();
            showSuccess('Question deleted successfully');
        } catch (error) {
            console.error('Error deleting question:', error);
            setErrorMessage('Failed to delete question. Please try again.');
        }
    };

    // Helper to show success message
    const showSuccess = (message: string) => {
        setSuccessMessage(message);
        setErrorMessage(null);

        // Auto-clear after 3 seconds
        setTimeout(() => {
            setSuccessMessage(null);
        }, 3000);
    };

    return (
        <Card className="card1">
            <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Manage Booking Questions</h2>

                {errorMessage && (
                    <Alert className="alert-error mb-4">
                        <AlertDescription>{errorMessage}</AlertDescription>
                    </Alert>
                )}

                {successMessage && (
                    <Alert className="alert-success mb-4">
                        <AlertDescription>{successMessage}</AlertDescription>
                    </Alert>
                )}

                {/* Questions List with Drag and Drop */}
                {isLoading ? (
                    <div className="text-center py-10">Loading questions...</div>
                ) : (
                    <div className="mb-8">
                        <h3 className="text-lg font-medium mb-4">Current Questions</h3>

                        {questions.length === 0 ? (
                            <div className="text-center py-6 border border-dashed border-gray-700 rounded-md">
                                <p className="text-gray-400">No questions added yet. Use the form below to add questions.</p>
                            </div>
                        ) : (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={questions.map(q => q.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {questions.map(question => (
                                        <SortableQuestionItem
                                            key={question.id}
                                            question={question}
                                            onEdit={handleEditQuestion}
                                            onDelete={handleDeleteQuestion}
                                        />
                                    ))}
                                </SortableContext>
                            </DndContext>
                        )}
                    </div>
                )}

                {/* Edit Question Form */}
                {editingQuestion && (
                    <div className="mb-8 p-4 border border-blue-600 rounded-md bg-gray-800">
                        <h3 className="text-lg font-medium mb-4">Edit Question</h3>

                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="edit-question-text">Question Text</Label>
                                <Input
                                    id="edit-question-text"
                                    value={editingQuestion.question_text}
                                    onChange={(e) => setEditingQuestion({ ...editingQuestion, question_text: e.target.value })}
                                    placeholder="Enter question text"
                                />
                            </div>

                            <div>
                                <Label htmlFor="edit-question-type">Question Type</Label>
                                <Select
                                    value={editingQuestion.question_type}
                                    onValueChange={(value: 'text' | 'number' | 'dropdown' | 'document') =>
                                        setEditingQuestion({ ...editingQuestion, question_type: value })
                                    }
                                >
                                    <SelectTrigger id="edit-question-type">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {QuestionTypes.map(type => (
                                            <SelectItem key={type.id} value={type.id}>{type.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {editingQuestion.question_type === 'dropdown' && (
                                <div>
                                    <Label htmlFor="edit-question-options">Options (one per line)</Label>
                                    <Textarea
                                        id="edit-question-options"
                                        value={editingQuestion.options || ''}
                                        onChange={(e) => setEditingQuestion({ ...editingQuestion, options: e.target.value })}
                                        placeholder="Enter options (one per line)"
                                        rows={4}
                                    />
                                </div>
                            )}

                            <div className="flex items-center">
                                <Checkbox
                                    id="edit-required"
                                    checked={editingQuestion.is_required}
                                    onCheckedChange={(checked) =>
                                        setEditingQuestion({ ...editingQuestion, is_required: !!checked })
                                    }
                                    className="mr-2"
                                />
                                <Label htmlFor="edit-required">Required</Label>
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button
                                    onClick={() => setEditingQuestion(null)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleUpdateQuestion}
                                    className="apply"
                                >
                                    <Save className="mr-2 h-4 w-4" />
                                    Update Question
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Add New Question Form */}
                <div className="p-4 border border-gray-700 rounded-md bg-gray-800">
                    <h3 className="text-lg font-medium mb-4">Add New Question</h3>

                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="question-text">Question Text</Label>
                            <Input
                                id="question-text"
                                value={newQuestion.question_text}
                                onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
                                placeholder="Enter question text"
                            />
                        </div>

                        <div>
                            <Label htmlFor="question-type">Question Type</Label>
                            <Select
                                value={newQuestion.question_type}
                                onValueChange={(value: 'text' | 'number' | 'dropdown' | 'document') =>
                                    setNewQuestion({ ...newQuestion, question_type: value })
                                }
                            >
                                <SelectTrigger id="question-type">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {QuestionTypes.map(type => (
                                        <SelectItem key={type.id} value={type.id}>{type.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {newQuestion.question_type === 'dropdown' && (
                            <div>
                                <Label htmlFor="question-options">Options (one per line)</Label>
                                <Textarea
                                    id="question-options"
                                    value={newQuestion.options}
                                    onChange={(e) => setNewQuestion({ ...newQuestion, options: e.target.value })}
                                    placeholder="Enter options (one per line)"
                                    rows={4}
                                />
                            </div>
                        )}

                        <div className="flex items-center">
                            <Checkbox
                                id="required"
                                checked={newQuestion.is_required}
                                onCheckedChange={(checked) => setNewQuestion({ ...newQuestion, is_required: !!checked })}
                                className="mr-2"
                            />
                            <Label htmlFor="required">Required</Label>
                        </div>

                        <Button
                            onClick={handleAddQuestion}
                            disabled={!newQuestion.question_text.trim()}
                            className="apply"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Question
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default InfrastructureQuestionsManager;