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
import { useTranslation } from 'react-i18next';

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
} from '@/utils';



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
  const { t } = useTranslation();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="mb-4 p-4 border border-gray-700 rounded-md bg-gray-800"
    >
      <div className="flex justify-between items-stretch">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab mr-2 p-1 rounded hover:bg-gray-700 flex items-center"
        >
          <GripVertical className="h-full w-5 text-gray-400" />
        </div>

        <div className="flex-1" dir='auto'>
          <div className="flex items-center">
            <h3 className="text-lg font-medium px-1">{question.question_text}</h3>
            {question.is_required ?
              <span className="text-red-400 text-sm px-1 pt-1">({t("Required")})</span> : ''}
            <span className="flex items-center text-sm px-2 pt-1 text-gray-400">
              {t(question.question_type)}
            </span>
          </div>

          {question.question_type === 'dropdown' && question.options && (
            <div className="mt-2 pl-8">
              <p dir="auto" className="text-sm text-gray-400 mb-1">
                {t("Options_Lst", "Options:")}
              </p>
              <p className="text-sm text-gray-300">
                {question.options
                  .split('\n')
                  .filter(opt => opt.trim() !== '')
                  .join(', ')}
              </p>
            </div>
          )}
        </div>

        <div className="flex">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(question.id)}
            className="mr-1 text-blue-400"
            title={t("Edit")}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(question.id)}
            className="text-red-400"
            title={t("Delete")}
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
  infrastructureName: string;
}

const InfrastructureQuestionsManager: React.FC<InfrastructureQuestionsManagerProps> = ({
  infrastructureId,
  infrastructureName
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

  const { t, i18n } = useTranslation();

  // Define question types
  const QuestionTypes = [
    { id: 'text', label: t('Free Text', 'Free Text') },
    { id: 'number', label: t('Number', 'Number') },
    { id: 'dropdown', label: t('Dropdown', 'Dropdown') },
    { id: 'document', label: t('Document Upload', 'Document Upload') }
  ];

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
      setErrorMessage(t('infrastructureManagementQuestions.errorLoadingQuestions', 'Failed to load questions. Please try again.'));
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
        setErrorMessage(t('infrastructureManagementQuestions.errorUpdatingOrder', 'Failed to update question order. Please try again.'));
        // Reload the questions to get the original order
        loadQuestions();
      }
    }
  };

  // Handle adding a new question
  const handleAddQuestion = async () => {
    if (!newQuestion.question_text.trim()) {
      setErrorMessage(t('infrastructureManagementQuestions.questionTextRequired', 'Question text is required'));
      return;
    }

    // Ensure infrastructureId is a valid number
    if (!infrastructureId || isNaN(infrastructureId)) {
      setErrorMessage(t('infrastructureManagementQuestions.invalidInfrastructureId', 'Invalid infrastructure ID'));
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
      setErrorMessage(t('infrastructureManagementQuestions.questionTextRequired'));
      return;
    }

    try {
      await saveInfrastructureQuestion({
        ...editingQuestion,
        options: editingQuestion.question_type === 'dropdown' ? editingQuestion.options ?? undefined : ''
      });

      setEditingQuestion(null);
      loadQuestions();
      showSuccess(t('infrastructureManagementQuestions.questionUpdatedSuccessfully', 'Question updated successfully'));
    } catch (error) {
      console.error('Error updating question:', error);
      setErrorMessage(t('infrastructureManagementQuestions.errorUpdatingQuestion', 'Failed to update question. Please try again.'));
    }
  };

  // Handle deleting a question
  const handleDeleteQuestion = async (id: number) => {
    if (!confirm(t('infrastructureManagementQuestions.confirmDelete', 'Are you sure you want to delete this question?'))) {
      return;
    }

    try {
      await deleteInfrastructureQuestion(infrastructureId, id);
      loadQuestions();
      showSuccess(t('infrastructureManagementQuestions.questionDeletedSuccessfully', 'Question deleted successfully'));
    } catch (error) {
      console.error('Error deleting question:', error);
      setErrorMessage(t('infrastructureManagementQuestions.errorDeletingQuestion', 'Failed to delete question. Please try again.'));
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
        <h2 className="text-2xl font-semibold mb-4">
          {t('infrastructureManagementQuestions.title', { infrast_name: infrastructureName })}
        </h2>

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
          <div className="text-center py-10" dir='auto'>{t('common.LoadingQuestions')}</div>
        ) : (
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4">{t('infrastructureManagementQuestions.currentQuestions')}</h3>

            {questions.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-gray-700 rounded-md">
                <p className="text-gray-400" dir='auto'>
                  {t('infrastructureManagementQuestions.noQuestionsAdded')}
                </p>
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
            <h3 className="text-lg font-medium mb-4">{t('infrastructureManagementQuestions.editQuestion')}</h3>

            <div className="space-y-4">
              <div>
                <Label>{t('infrastructureManagementQuestions.QuestionText')}</Label>
                <Input
                  id="edit-question-text"
                  value={editingQuestion.question_text}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, question_text: e.target.value })}
                  placeholder={t('infrastructureManagementQuestions.QuestionTextplaceholder')}
                  dir={editingQuestion.question_text.trim() !== '' ? 'auto' : i18n.dir()}
                />
              </div>

              <div>
                <Label>{t('infrastructureManagementQuestions.QuestionType')}</Label>
                <Select
                  value={editingQuestion.question_type}
                  onValueChange={(value: 'text' | 'number' | 'dropdown' | 'document') =>
                    setEditingQuestion({ ...editingQuestion, question_type: value })
                  }
                  dir={i18n.dir()}
                >
                  <SelectTrigger id="edit-question-type" className='border-1 border-gray-700'>
                    <SelectValue placeholder={t('infrastructureManagementQuestions.SelectType', "Select type")} />
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
                  <Label>{t('infrastructureManagementQuestions.QuestionOptions')}</Label>
                  <Textarea
                    id="edit-question-options"
                    value={editingQuestion.options || ''}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, options: e.target.value })}
                    placeholder={t('infrastructureManagementQuestions.QuestionOptionsEnter')}
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
                <Label>{t('Required', 'Required')}</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => setEditingQuestion(null)}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleUpdateQuestion}
                  className="apply"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {t('infrastructureManagementQuestions.updateQuestion')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Add New Question Form */}
        <div className="p-4 border border-gray-700 rounded-md bg-gray-800">
          <h3 className="text-lg font-medium mb-4">{t('infrastructureManagementQuestions.addNewQuestion')}</h3>

          <div className="space-y-4">
            <div>
              <Label>{t('infrastructureManagementQuestions.QuestionText', 'Question Text')}</Label>
              <Input
                id="question-text"
                value={newQuestion.question_text}
                onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
                placeholder={t('infrastructureManagementQuestions.QuestionTextplaceholder')}
                dir={newQuestion.question_text.trim() !== '' ? 'auto' : i18n.dir()}
              />
            </div>

            <div>
              <Label>{t('infrastructureManagementQuestions.QuestionType', 'Question Type')}</Label>
              <Select
                value={newQuestion.question_type}
                onValueChange={(value: 'text' | 'number' | 'dropdown' | 'document') =>
                  setNewQuestion({ ...newQuestion, question_type: value })
                }
                dir={i18n.dir()}
              >
                <SelectTrigger id="question-type" className='border-1 border-gray-700'>
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
                <Label>{t('infrastructureManagementQuestions.QuestionOptions')}</Label>
                <Textarea
                  id="question-options"
                  value={newQuestion.options}
                  onChange={(e) => setNewQuestion({ ...newQuestion, options: e.target.value })}
                  placeholder={t('infrastructureManagementQuestions.QuestionOptionsEnter')}
                  rows={4}
                  dir={i18n.dir()}
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
              <Label htmlFor="required">{t('Required')}</Label>
            </div>

            <Button
              onClick={handleAddQuestion}
              disabled={!newQuestion.question_text.trim()}
              className="apply"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('infrastructureManagementQuestions.addQuestion')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InfrastructureQuestionsManager;