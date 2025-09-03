import React, { useEffect, useState } from "react";

interface EditableTextProps {
    text: string;
    onSave: (newText: string) => void;
    row_character_number?: number;
    before: string;
    after: string;
    defaultText?: string;
}

const EditableText: React.FC<EditableTextProps> = ({ text, onSave, row_character_number, before, after, defaultText }) => {
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [currentText, setCurrentText] = useState<string>(text);

    const handleTextDoubleClick = () => {
        setIsEditing(true);
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setCurrentText(e.target.value);
    };

    const handleBlur = () => {
        setIsEditing(false);
        onSave(currentText);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter") {
            setIsEditing(false);
            onSave(currentText);
        }
    };

    useEffect(() => {
        setCurrentText(text);
    }, [text]);

    return (
        <div className="w-full max-w-full">
            {isEditing ? (
                <textarea
                    rows={Math.max(1, Math.ceil(currentText?.length / row_character_number) + 1)}
                    value={currentText}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    className={after}
                />
            ) : (
                <p
                    className={before}
                    onDoubleClick={handleTextDoubleClick}
                >
                    {currentText && currentText.length > 0
                        ? currentText.length > 25
                            ? `${currentText.substring(0, 25)}...`
                            : currentText
                        : defaultText}
                </p>
            )}
        </div>
    );
};

export default EditableText;
