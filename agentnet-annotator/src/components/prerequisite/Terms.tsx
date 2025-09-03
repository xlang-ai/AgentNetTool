import React, { useState } from 'react';
import { CheckCircleIcon, InformationCircleIcon } from '@heroicons/react/20/solid';

interface TermsAndConsentProps {
    onAgree: () => void;
    onDisagree: () => void;
}

const TermsAndConsent: React.FC<TermsAndConsentProps> = ({ onAgree, onDisagree }) => {
    const [isChecked, setIsChecked] = useState(false);

    const handleAgree = () => {
        if (isChecked) {
            localStorage.setItem('termsAgreed', 'true');
            onAgree();
        }
    };

    const handleDisagree = () => {
        localStorage.setItem('termsAgreed', 'false');
        onDisagree();
    };

    return (
        <div className="bg-white px-6 py-32 lg:px-8">
            <div className="mx-auto max-w-5xl text-base leading-7 text-gray-700">
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">AgentNet User Consent Form</h1>
                <div className="mt-10 max-w-5xl">
                    <div className="bg-gray-100 p-6 rounded-lg shadow-inner overflow-y-auto font-serif text-sm" style={{ height: "60vh", maxHeight: '50%' }}>
                        <h2 className="text-2xl font-bold mb-4">Overview</h2>
                        <p className="mb-4">This form provides you with important information about taking part in our study. The purpose of the study is to collect various types of computer data (actions such as clicks and scrolls, desktop recordings and webpage HTML etc.) while participants work on their computer tasks. In this study, we will ask you to 1) Brainstorm computer tasks and write the task instruction; 2)  Install and use our annotation app to record your demonstration of the task on your computer; 3) Upload them for review.</p>
                        <p className="mb-4">During this study, we will collect certain data from you, including:</p>
                        <ul style={{ listStyleType: 'decimal', paddingLeft: '20px' }} className="mb-4">
                            <li>The screen recording of your computer while performing the task;</li>
                            <li>The captured computer data (actions such as clicks and scrolls, desktop recordings and webpage HTML etc.) in the annotation.</li>
                        </ul>
                        <p className="mb-4">This data will be used to build research datasets for training AI agents that can control computers just like humans.</p>
                        <h3 className="text-xl font-bold mt-6 mb-2">Data Collection Statement</h3>
                        {/* You control the operation of this application and can start or stop data collection at any time. The app won’t run in the background or collect data without your permission. 
Screen recordings are stored locally on your device until you manually confirm the upload. It’s your responsibility to ensure no personal or sensitive information is included in the data you upload.
Your personal information will be kept strictly confidential, and all data will be anonymised and stored securely.
The collected data would be used for academic research and industrial purposes.
You may ask for deletion of any data collected from you if your personal information is identified. */}
                        <ul style={{ listStyleType: 'decimal', paddingLeft: '20px' }} className="mb-4">
                            <li>You control the operation of this application and can start or stop data collection at any time. The app won’t run in the background or collect data without your permission.</li>
                            <li>Screen recordings are stored locally on your device until you manually confirm the upload. It’s your responsibility to ensure no personal or sensitive information is included in the data you upload.</li>
                            <li>Your personal information will be kept strictly confidential, and all data will be anonymised and stored securely.</li>
                            <li>The collected data would be used for academic research and industrial purposes.</li>
                            <li>You may ask for deletion of any data collected from you if your personal information is identified.</li>
                        </ul>
                        <h3 className="text-xl font-bold mt-6 mb-2">Software Statement</h3>
                        <ul style={{ listStyleType: 'decimal', paddingLeft: '20px' }} className="mb-4">
                            <li>You may not copy, modify, distribute, or sell the application or its content without our prior written consent.</li>
                            <li>You may not reverse engineer, decompile, access the source code, or distribute, sell, modify, or misuse the software and its data.</li>
                        </ul>
                        <h3 className="text-xl font-bold mt-6 mb-2">Contact Us</h3>
                        <p className="mb-4">If you have any questions, concerns, or feedback related to this study, please feel free to contact: xlang.agentnet@gmail.com</p>
                        
                    </div>

                    {/* <ul role="list" className="mt-8 max-w-5xl space-y-8 text-gray-600">
                        <li className="flex gap-x-3">
                            <CheckCircleIcon className="mt-1 h-5 w-5 flex-none text-indigo-600" aria-hidden="true" />
                            <span>
                                <strong className="font-semibold text-gray-900">Data Collection.</strong> We collect and process your data as described in our privacy policy.
                            </span>
                        </li>
                        <li className="flex gap-x-3">
                            <CheckCircleIcon className="mt-1 h-5 w-5 flex-none text-indigo-600" aria-hidden="true" />
                            <span>
                                <strong className="font-semibold text-gray-900">User Responsibilities.</strong> You agree to use our services in compliance with applicable laws and regulations.
                            </span>
                        </li>
                        <li className="flex gap-x-3">
                            <CheckCircleIcon className="mt-1 h-5 w-5 flex-none text-indigo-600" aria-hidden="true" />
                            <span>
                                <strong className="font-semibold text-gray-900">Consent to Participate.</strong> By agreeing, you consent to participate in our research and data collection efforts.
                            </span>
                        </li>
                    </ul> */}
                    <div className="mt-8 flex items-center">
                        <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => setIsChecked(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 mr-2"
                        />
                        <label className="text-sm font-semibold leading-6 text-gray-900">
                        I have read and understood the information provided in this consent form and voluntarily agreed to participate in AgentNet study.
                        </label>
                    </div>
                    <button
                        onClick={handleAgree}
                        disabled={!isChecked}
                        className="mt-6 mr-4 rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Agree and Continue
                    </button>
                    <button
                        onClick={handleDisagree}
                        className="mt-6 rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Disagree
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TermsAndConsent;
