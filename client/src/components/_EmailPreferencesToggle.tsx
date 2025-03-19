// src/components/EmailPreferencesToggle.tsx
import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { fetchEmailPreferences, updateEmailPreferences } from '@/_utils';

interface EmailPreferencesToggleProps {
    className?: string;
}

const EmailPreferencesToggle: React.FC<EmailPreferencesToggleProps> = ({ className }) => {
    const [enabled, setEnabled] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        loadPreferences();
    }, []);

    const loadPreferences = async () => {
        try {
            setIsLoading(true);
            const data = await fetchEmailPreferences();

            if (data.success && data.email_notifications) {
                setEnabled(data.email_notifications);
            } else {
                throw new Error(data.message || 'Failed to load preferences');
            }
        } catch (error) {
            console.error('Error loading email preferences:', error);
            setMessage({
                type: 'error',
                text: error instanceof Error ? error.message : 'Failed to load email preferences'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggle = async (checked: boolean) => {
        try {
            setIsLoading(true);
            const result = await updateEmailPreferences(checked);

            if (result.success) {
                setEnabled(checked);
                setMessage({
                    type: 'success',
                    text: checked
                        ? 'You have been subscribed to email notifications'
                        : 'You have been unsubscribed from email notifications'
                });
            } else {
                throw new Error(result.message || 'Failed to update preferences');
            }

            // Clear success message after 3 seconds
            setTimeout(() => {
                setMessage(null);
            }, 3000);
        } catch (error) {
            console.error('Error updating email preferences:', error);
            setMessage({
                type: 'error',
                text: error instanceof Error ? error.message : 'Failed to update email preferences'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className={className}>
            <CardContent className="p-4">
                <div className="flex flex-col sm:flex-col sm:items-center sm:justify-between">
                    <div className="mb-4 sm:mb-0">
                        <h3 className="text-lg font-medium mb-1">Email Notifications</h3>
                        <p className="text-sm text-gray-400">
                            {enabled
                                ? 'You will receive email notifications about your bookings and updates'
                                : 'You will not receive any email notifications from the system'}
                        </p>
                    </div>
                    <div className="flex justify-center space-x-2 mt-3">
                        <Label htmlFor="email-notifications" className="sr-only">
                            Email Notifications
                        </Label>
                        <Switch
                            id="email-notifications"
                            checked={enabled}
                            onCheckedChange={handleToggle}
                            disabled={isLoading}
                        />
                    </div>
                </div>

                {message && (
                    <Alert className={`mt-4 ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                        <AlertDescription>{message.text}</AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
};

export default EmailPreferencesToggle;