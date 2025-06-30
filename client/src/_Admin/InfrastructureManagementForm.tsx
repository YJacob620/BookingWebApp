import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from '@/components/ui/label';

import { Infrastructure, InfrastFormData } from '@/utils';
import { useTranslation } from 'react-i18next';


interface InfrastructureFormProps {
    isEditMode: boolean;
    editingInfrastructure: Infrastructure | null;
    onSubmit: (formData: InfrastFormData) => Promise<void>;
    onCancelEdit: () => void;
    // onDataChange: () => void;
}

const InfrastructureManagementForm: React.FC<InfrastructureFormProps> = ({
    isEditMode,
    editingInfrastructure,
    onSubmit,
    onCancelEdit,
    // onDataChange
}) => {
    const { t } = useTranslation()

    const [formData, setFormData] = useState<InfrastFormData>({
        name: '',
        description: '',
        location: '',
        is_active: true,
    });

    // Update form when editing infrastructure changes
    useEffect(() => {
        if (isEditMode && editingInfrastructure) {
            setFormData({
                name: editingInfrastructure.name,
                description: editingInfrastructure.description || '',
                location: editingInfrastructure.location || '',
                is_active: !!editingInfrastructure.is_active, // Convert to boolean properly
            });
        } else if (!isEditMode) {
            // Reset form when not in edit mode
            setFormData({
                name: '',
                description: '',
                location: '',
                is_active: true,
            });
        }
    }, [isEditMode, editingInfrastructure]);

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleCheckboxChange = (checked: boolean) => {
        setFormData(prev => ({
            ...prev,
            is_active: checked
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit(formData);
    };

    return (
        <Card className="card1 mb-8">
            <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">
                        {isEditMode ? t('infManageForm.Edit Infrastructure') : t('infManageForm.Add New Infrastructure')}
                    </h2>
                    {isEditMode && (
                        <Button
                            onClick={onCancelEdit}
                            className="discard h-8"
                        >
                            {t('infManageForm.Cancel Edit')}
                        </Button>
                    )}
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <p className="mb-1">{t('infManageForm.Infrastructure Name')} *</p>
                            <Input
                                id="name"
                                name="name"
                                required
                                maxLength={100}
                                value={formData.name}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div className="space-y-2">
                            <p className="mb-1">{t('infManageForm.Location')} *</p>
                            <Input
                                id="location"
                                name="location"
                                required
                                maxLength={100}
                                value={formData.location}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <p className="mb-1">{t('infManageForm.Description')} *</p>
                        <Textarea
                            id="description"
                            name="description"
                            required
                            value={formData.description}
                            onChange={handleInputChange}
                            className="h-32"
                        />
                    </div>

                    <div className="flex items-center space-x-2 pl-1">
                        <Checkbox
                            id="is_active"
                            checked={formData.is_active}
                            onCheckedChange={handleCheckboxChange}
                            className="h-5 w-5"
                        />
                        <Label htmlFor="is_active" className='text-md font-normal'>{t('infManageForm.Infrastructure is active')}</Label>
                    </div>

                    <Button type="submit" className="apply">
                        {isEditMode ? t('infManageForm.Update Infrastructure') : t('infManageForm.Add Infrastructure')}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
};

export default InfrastructureManagementForm;