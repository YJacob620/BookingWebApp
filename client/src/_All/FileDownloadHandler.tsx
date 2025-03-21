import React, { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '@/_utils';

const FileDownloadHandler: React.FC = () => {
    const { bookingId, questionId } = useParams<{ bookingId: string; questionId: string }>();
    const navigate = useNavigate();

    // Use a ref to track if the download has been initiated
    const hasProcessed = useRef(false);

    useEffect(() => {
        const downloadFile = async () => {
            // Prevent duplicate downloads in StrictMode
            if (hasProcessed.current) return;

            try {
                // Mark as processed immediately to prevent duplicate downloads
                hasProcessed.current = true;

                const token = localStorage.getItem('token');
                if (!token) {
                    throw new Error('Not authenticated');
                }

                // Make authenticated request
                const response = await fetch(`${API_BASE_URL}/bookings/download-file/${bookingId}/${questionId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`Server error: ${response.status}`);
                }

                // Debug: Log all response headers to help troubleshoot
                console.log('Response headers:');
                response.headers.forEach((value, key) => {
                    console.log(`${key}: ${value}`);
                });

                // We'll use the document name from the URL query parameter
                // The BookingDetailsDialog component will pass the original filename
                const urlParams = new URLSearchParams(window.location.search);
                const originalFilename = urlParams.get('filename');

                // Use the provided filename or a fallback
                let filename = originalFilename || `document_${bookingId}_${questionId}.pdf`;

                console.log('Using filename:', filename);

                // Create and trigger download
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();

                // Clean up and navigate back
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                // Go back to previous page after a short delay
                setTimeout(() => navigate(-1), 500);
            } catch (error) {
                console.error('Download error:', error);
                alert('Download failed. Please try again.');
                navigate(-1);
            }
            console.error("WTF???");
            navigate(-1);
        };

        if (bookingId && questionId) {
            downloadFile();
        }
    }, [bookingId, questionId, navigate]);

    // Return minimal UI
    return <div className="p-4 text-center">Downloading file...</div>;
};

export default FileDownloadHandler;