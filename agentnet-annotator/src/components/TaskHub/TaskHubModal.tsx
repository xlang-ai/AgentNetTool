import React, { useState, useEffect } from "react";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { ChartBarIcon, ComputerDesktopIcon } from "@heroicons/react/20/solid";
import {
    LinkIcon,
    TagIcon,
    BookOpenIcon,
    MagnifyingGlassIcon,
    XMarkIcon,
    PlusIcon,
    ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWindows, faApple } from "@fortawesome/free-brands-svg-icons";
import { useMain } from "../../context/MainContext";
import Skeleton from "@mui/material/Skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { set } from "date-fns";
import { v4 as uuidv4 } from "uuid";

interface TaskHubModalProps {
    open: boolean;
    onClose: () => void;
}

enum TaskStatus {
    selected = "selected",
    infeasible = "infeasible",
    invalid = "invalid",
    undecided = "undecided",
}

enum TaskSource {
    video = "video",
    text_web = "text_web",
    text_pc = "text_pc",
    text_os = "text_os",
}

enum TaskCategory {
    app = "app",
    website = "website",
    os = "os",
}

enum TaskPlatform {
    win = "win",
    mac = "mac",
    both = "both",
}

interface tutorialProps {
    task_id: string | null;
    status: string | null;
    annotation_count: number;
    task_name: string | null;
    task_description: string | null;
    url: string | null;
    task_source: string;
    category: string;
    platform: string;
    info?: Record<string, any> | null;
}

export const TaskHubModal: React.FC<TaskHubModalProps> = ({
    open,
    onClose,
}) => {
    const getBadge = (source: string): JSX.Element[] => {
        const badges: JSX.Element[] = [];

        if (source === TaskSource.video) {
            badges.push(
                <span
                    key="video"
                    className="inline-flex items-center gap-x-1.5 py-1.5 px-3 rounded-full text-xs font-medium bg-gray-800 text-white dark:bg-white dark:text-neutral-800"
                >
                    Video
                </span>
            );
        } else if (source?.startsWith("text_")) {
            badges.push(
                <span
                    key="text"
                    className="inline-flex items-center gap-x-1.5 py-1.5 px-3 rounded-full text-xs font-medium bg-gray-500 text-white"
                >
                    Text
                </span>
            );
            const suffix = source?.split("_")[1]; // Get the suffix after 'text_'
            badges.push(
                <span
                    key={suffix}
                    className="inline-flex items-center gap-x-1.5 py-1.5 px-3 rounded-full text-xs font-medium bg-teal-500 text-white"
                >
                    {suffix.toUpperCase()}
                </span>
            );
        }

        return badges;
    };
    const [categories, setCategories] = useState<string[] | null>([]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [expandedIndex, setExpandedIndex] = useState(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [customDomain, setCustomDomain] = useState("");

    const {
        username,
        setIsRecording,
        SocketService,
        showError,
        showSuccess,
        setHubTaskId,
        setHubTaskName,
        setHubTaskDescription,
        suggestions,
        setSuggestions,
        tutorials,
        setTutorials,
        userData,
    } = useMain();
    useEffect(() => {
        if (open) {
            fetchCategories();
        }
    }, [open]);

    const toggleExpand = (index: number) => {
        setExpandedIndex(expandedIndex === index ? null : index);
    };

    const fetchCategories = async () => {
        setLoading(true);
        console.log("Fetching categories...");
        try {
            const response = await fetch(
                "http://localhost:5328/get_hub_task_categories",
                { method: "GET" }
            );
            if (response.ok) {
                const resjson = await response.json();
                if (resjson.success) {
                    console.log(
                        "Categories fetched successfully:",
                        resjson.data
                    );
                    setCategories(resjson.data);
                } else {
                    setCategories([]);
                }
            }
        } catch (error) {
            console.error("Failed to fetch categories:", error);
            setLoading(false);
        }
    };

    // Handle category change
    const handleCategoryChange = (
        event: React.ChangeEvent<HTMLSelectElement>
    ) => {
        const selectedOption = event.target.value;
        if (selectedOption && !selectedCategories.includes(selectedOption)) {
            setSelectedCategories((prev) => [...prev, selectedOption]);
            fetchTutorials([...selectedCategories, selectedOption]);
        }
        // Reset the select element to its default state
        event.target.value = "";
    };

    // Remove a category
    const removeCategory = (category: string) => {
        setSelectedCategories((prev) => prev.filter((cat) => cat !== category));
        fetchTutorials(selectedCategories.filter((cat) => cat !== category));
    };

    // Function to fetch tutorials based on selected categories
    const fetchTutorials = async (categories: string[], query = "") => {
        try {
            const response = await fetch(
                "http://localhost:5328/fetch_from_task_hub",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        category: categories[0],
                        limit: 5,
                        query: query,
                    }),
                }
            );
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    console.log("Tutorials fetched successfully:", data.data);
                    setTutorials(data.data);
                } else {
                    setTutorials(null);
                }
            }
        } catch (error) {
            console.error("Failed to fetch tutorials:", error);
            setLoading(false);
        } finally {
            setLoading(false);
        }
    };

    const [tooltipText, setTooltipText] = useState("Copy");

    // 复制到剪贴板的函数
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setTooltipText("Copied");
            setTimeout(() => setTooltipText("Copy"), 2000); // 2秒后重置 tooltip 文字
        });
    };

    const getPlatformIcon = (platform: string): JSX.Element | JSX.Element[] => {
        const elements: JSX.Element[] = [];
        switch (platform) {
            case TaskPlatform.win:
                elements.push(<FontAwesomeIcon key="win" icon={faWindows} />);
                elements.push(<span key="win-text">{platform}</span>);
                break;
            case TaskPlatform.mac:
                elements.push(<FontAwesomeIcon key="mac" icon={faApple} />);
                elements.push(<span key="mac-text">{platform}</span>);
                break;
            case TaskPlatform.both:
                elements.push(<FontAwesomeIcon key="win" icon={faWindows} />);
                elements.push(<FontAwesomeIcon key="mac" icon={faApple} />);
                elements.push(<span key="both-text">All</span>);
                break;
            default:
                elements.push(<span key="others">{platform}</span>);
                break;
        }
        return elements;
    };

    const handleRegenerate = () => {
        setTutorials([]);
        fetchTutorials(selectedCategories);
    };

    const handleReport = async () => {
        if (tutorials) {
            try {
                const response = await fetch(
                    "http://localhost:5328/report_task_hub",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            task_id: tutorials[expandedIndex].task_id,
                        }),
                    }
                );
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        fetchTutorials(selectedCategories);
                    } else {
                        console.log("Failed to report task:", data);
                    }
                }
            } catch (error) {
                console.error("Failed to report task:", error);
                setLoading(false);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleContinue = () => {
        console.log("Continue task:", tutorials[expandedIndex]);
        console.log("Continue task name:", tutorials[expandedIndex]?.task_name);
        console.log("Continue task id:", tutorials[expandedIndex]?.task_id);
        // Removed login check - allow recording without authentication
        console.log(username);
        setHubTaskId(tutorials[expandedIndex]?.task_id);
        setHubTaskName(tutorials[expandedIndex]?.task_name);
        setHubTaskDescription(tutorials[expandedIndex]?.task_description);
        onClose();
    };

    const fetchSuggestions = async (query: string, categories: string[]) => {
        setIsLoadingSuggestions(true);
        try {
            const response = await fetch(
                "http://localhost:5328/get_gpt_suggestions",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        userreq: query,
                        domains: categories,
                    }),
                }
            );
            if (response.ok) {
                const data = await response.json();
                if (data.status === "succeed") {
                    setSuggestions(data.task_list);
                } else {
                    setSuggestions([]);
                }
            }
        } catch (error) {
            console.error("Failed to fetch suggestions:", error);
            setSuggestions([]);
        } finally {
            setIsLoadingSuggestions(false);
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            fetchSuggestions(searchQuery, selectedCategories);
            fetchTutorials(selectedCategories, searchQuery);
        }
    };

    const handleCustomDomainSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (
            customDomain.trim() &&
            !selectedCategories.includes(customDomain.trim())
        ) {
            setSelectedCategories((prev) => [...prev, customDomain.trim()]);
            fetchTutorials([...selectedCategories, customDomain.trim()]);
            setCustomDomain("");
        }
    };

    const handleContinueWithSuggestion = (suggestion: string) => {
        console.log("Continuing with suggestion:", suggestion);
        // Removed login check - allow recording without authentication
        setHubTaskId("gpt+" + uuidv4());
        setHubTaskName(suggestion);
        setHubTaskDescription("");
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} className="relative z-50">
            <DialogBackdrop className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity dark:bg-gray-900 dark:bg-opacity-75" />
            <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
                <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                    {!userData || userData.user_type === null ? (
                        <DialogPanel
                        className="flex flex-col relative p-10 transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg dark:bg-gray-800"
                        style={{
                            width: "75%",
                            maxWidth: "75%",
                        }}
                    >
                        Invalid user type. Please login first.
                        </DialogPanel>
                    ) : userData.user_type === "BANNED" ? (
                        <DialogPanel
                            className="flex flex-col relative p-10 transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg dark:bg-gray-800"
                            style={{
                                width: "75%",
                                maxWidth: "75%",
                            }}
                        >
                            You are banned from AgentNet due to violation of our
                            terms and conditions.
                        </DialogPanel>
                    ) : (
                        <DialogPanel
                            className="flex flex-col relative p-10 transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg dark:bg-gray-800"
                            style={{
                                width: "75%",
                                maxWidth: "75%",
                            }}
                        >
                            <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center dark:text-white">
                                Task Generation
                            </h1>
                            <div className="mb-4 w-full">
                                <label
                                    htmlFor="search"
                                    className="block text-base font-medium text-black mb-0.5 dark:text-white"
                                >
                                    Search or ask AI for inspiration
                                </label>
                                <p className="text-xs text-gray-500 mb-2 dark:text-gray-400">
                                    You can search for tasks or ask AI for
                                    inspiration
                                </p>
                                <form
                                    onSubmit={handleSearch}
                                    className="flex items-center"
                                >
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) =>
                                            setSearchQuery(e.target.value)
                                        }
                                        placeholder="Search or ask a question..."
                                        className="flex-grow p-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                    <button
                                        type="submit"
                                        className="p-2 bg-indigo-600 text-white rounded-r-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-indigo-700 dark:hover:bg-indigo-600"
                                    >
                                        <MagnifyingGlassIcon className="h-5 w-5" />
                                    </button>
                                </form>
                            </div>

                            <div className="mb-4 w-full">
                                <label
                                    htmlFor="category"
                                    className="block text-base font-medium text-black mb-0.5 dark:text-white"
                                >
                                    Select or Add Domains
                                </label>
                                <p className="text-xs text-gray-500 mb-2 dark:text-gray-400">
                                    Choose or add task domains you're interested
                                    in, such as specific apps, websites, or
                                    platforms
                                </p>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {selectedCategories.map((category) => (
                                        <span
                                            key={category}
                                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                        >
                                            {category}
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeCategory(category)
                                                }
                                                className="flex-shrink-0 ml-1 h-4 w-4 rounded-full inline-flex items-center justify-center text-blue-400 hover:bg-blue-200 hover:text-blue-500 focus:outline-none focus:bg-blue-500 focus:text-white dark:text-blue-300 dark:hover:bg-blue-800"
                                            >
                                                <span className="sr-only">
                                                    Remove {category}
                                                </span>
                                                <XMarkIcon
                                                    className="h-3 w-3"
                                                    aria-hidden="true"
                                                />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <select
                                        id="category"
                                        name="category"
                                        onChange={handleCategoryChange}
                                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md text-gray-800 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    >
                                        <option value="">
                                            Select a domain
                                        </option>
                                        {categories.map((category) => (
                                            <option
                                                key={category}
                                                value={category}
                                            >
                                                {category}
                                            </option>
                                        ))}
                                    </select>
                                    <form
                                        onSubmit={handleCustomDomainSubmit}
                                        className="mt-1 flex-grow flex"
                                    >
                                        <input
                                            type="text"
                                            value={customDomain}
                                            onChange={(e) =>
                                                setCustomDomain(e.target.value)
                                            }
                                            placeholder="Add custom domain"
                                            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-l-md text-gray-800 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        />
                                        <button
                                            type="submit"
                                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-r-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-700 dark:hover:bg-indigo-600"
                                        >
                                            <PlusIcon
                                                className="h-5 w-5"
                                                aria-hidden="true"
                                            />
                                        </button>
                                    </form>
                                </div>
                            </div>
                            <div className="flex flex-row grid grid-cols-2 gap-4">
                                <div className="w-full cols-span-1">
                                    <h3 className="text-lg font-medium text-gray-900 mb-4 dark:text-white">
                                        Tutorials Hub
                                    </h3>
                                    <p className="text-sm text-gray-600 mb-4 dark:text-gray-400">
                                        Here you'll find tutorials we've
                                        collected from the internet. You can
                                        copy the URL to view the tutorial in
                                        your browser and complete the task based
                                        on it. Click on a tutorial to see more
                                        details and options.
                                    </p>

                                    {selectedCategories.length !== 0 ? (
                                        tutorials.length !== 0 ? (
                                            tutorials.map((tutorial, index) => (
                                                <div
                                                    key={tutorial.task_name}
                                                    className="mb-4 rounded-lg bg-gray-50 shadow-sm ring-1 ring-gray-900/5 dark:bg-gray-700 dark:ring-gray-600/20"
                                                >
                                                    {/* Header section with Name and URL */}
                                                    <div
                                                        className="flex justify-between items-center p-4 cursor-pointer"
                                                        onClick={() =>
                                                            toggleExpand(index)
                                                        }
                                                    >
                                                        <div className="text-md text-gray-900 dark:text-white">
                                                            {tutorial.task_name}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="js-clipboard-example hs-tooltip relative py-1 px-2 inline-flex justify-center items-center gap-x-2 text-sm font-mono rounded-lg border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                copyToClipboard(
                                                                    tutorial?.url
                                                                );
                                                            }}
                                                            data-clipboard-target="#hs-clipboard-tooltip-on-hover"
                                                            data-clipboard-action="copy"
                                                            data-clipboard-success-text="Copied"
                                                        >
                                                            <span className="p-1 dark:border-neutral-700">
                                                                <svg
                                                                    className="js-clipboard-default size-4 group-hover:rotate-6 transition"
                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                    width="24"
                                                                    height="24"
                                                                    viewBox="0 0 24 24"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    strokeWidth="2"
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                >
                                                                    <rect
                                                                        width="8"
                                                                        height="4"
                                                                        x="8"
                                                                        y="2"
                                                                        rx="1"
                                                                        ry="1"
                                                                    ></rect>
                                                                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                                                </svg>

                                                                <svg
                                                                    className="js-clipboard-success hidden size-4 text-blue-600 rotate-6"
                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                    width="24"
                                                                    height="24"
                                                                    viewBox="0 0 24 24"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    strokeWidth="2"
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                >
                                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                                </svg>
                                                            </span>

                                                            <span
                                                                className="hs-tooltip-content hs-tooltip-shown:opacity-100 hs-tooltip-shown:visible opacity-0 transition-opacity hidden invisible z-10 py-1 px-2 bg-gray-900 text-xs font-medium text-white rounded-lg shadow-sm dark:bg-neutral-700"
                                                                role="tooltip"
                                                            >
                                                                <span className="js-clipboard-success-text">
                                                                    {
                                                                        tooltipText
                                                                    }
                                                                </span>
                                                            </span>
                                                        </button>

                                                        {copied && (
                                                            <div className="absolute top-full mt-1 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-900 text-xs font-medium text-white rounded-md shadow-lg">
                                                                The link is
                                                                copied
                                                            </div>
                                                        )}
                                                    </div>

                                                    {expandedIndex ===
                                                        index && (
                                                        <div className="p-4 border-t border-gray-900/5 dark:border-gray-600/20">
                                                            <dl className="flex flex-wrap">
                                                                {/* Status */}
                                                                <div className="w-full mb-4">
                                                                    <dt className="sr-only">
                                                                        Status
                                                                    </dt>
                                                                    {tutorial.status ===
                                                                    "selected" ? (
                                                                        <dd className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                                                            Selected
                                                                        </dd>
                                                                    ) : (
                                                                        <dd className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                                                                            Undecided
                                                                        </dd>
                                                                    )}
                                                                </div>

                                                                {/* Source */}
                                                                <div className="w-full mb-4 flex items-center gap-2">
                                                                    <ChartBarIcon
                                                                        className="h-6 w-5 text-gray-400"
                                                                        aria-hidden="true"
                                                                    />
                                                                    <span className="text-sm text-gray-800 dark:text-gray-300">
                                                                        Source:
                                                                    </span>
                                                                    <span className="text-sm text-gray-900 dark:text-gray-200">
                                                                        {getBadge(
                                                                            tutorial.task_source
                                                                        )}
                                                                    </span>
                                                                </div>

                                                                {/* Platform */}
                                                                <div className="w-full mb-4 flex items-center gap-2">
                                                                    <ComputerDesktopIcon
                                                                        className="h-6 w-5 text-gray-400"
                                                                        aria-hidden="true"
                                                                    />
                                                                    <span className="text-sm text-gray-800 dark:text-gray-300">
                                                                        Platform:
                                                                    </span>
                                                                    <span className="text-sm text-gray-900 dark:text-gray-200">
                                                                        {getPlatformIcon(
                                                                            tutorial.platform
                                                                        )}
                                                                    </span>
                                                                </div>

                                                                {/* Category */}
                                                                <div className="w-full mb-4 flex items-center gap-2">
                                                                    <TagIcon
                                                                        className="h-6 w-5 text-gray-400"
                                                                        aria-hidden="true"
                                                                    />
                                                                    <span className="text-sm text-gray-800 dark:text-gray-300">
                                                                        Category:
                                                                    </span>
                                                                    <span className="text-sm text-gray-900 dark:text-gray-200">
                                                                        {
                                                                            tutorial.category
                                                                        }
                                                                    </span>
                                                                </div>

                                                                {/* Action Buttons */}
                                                                <div className="w-full mt-6 border-t border-gray-900/5 pt-4 flex gap-2 dark:border-gray-600/20">
                                                                    <button
                                                                        type="button"
                                                                        className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 dark:bg-red-700 dark:hover:bg-red-600"
                                                                        onClick={
                                                                            handleReport
                                                                        }
                                                                    >
                                                                        Report
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 dark:bg-indigo-700 dark:hover:bg-indigo-600"
                                                                        onClick={
                                                                            handleContinue
                                                                        }
                                                                    >
                                                                        Continue
                                                                        &rarr;
                                                                    </button>
                                                                </div>
                                                            </dl>
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="w-full flex justify-center items-center text-gray-800 dark:text-gray-200">
                                                Loading...
                                            </div>
                                        )
                                    ) : null}
                                    {selectedCategories.length !== 0 ? (
                                        <button
                                            type="button"
                                            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600"
                                            onClick={handleRegenerate}
                                        >
                                            Regenerate
                                        </button>
                                    ) : null}
                                </div>
                                <div className="w-full cols-span-1">
                                    <h3 className="text-lg font-medium text-gray-900 mb-4 dark:text-white">
                                        GPT Suggestions
                                    </h3>
                                    <p className="text-sm text-gray-600 mb-4 dark:text-gray-400">
                                        These are AI-generated task suggestions
                                        based on your search query and selected
                                        domains. Click the arrow button to start
                                        a task with the suggested prompt.
                                    </p>

                                    {isLoadingSuggestions ? (
                                        <div className="flex animate-pulse w-full">
                                            <ul className="mt-5 space-y-5 w-full">
                                                <li className="w-full h-6 bg-gray-200 rounded-full dark:bg-gray-600"></li>
                                                <li className="w-full h-6 bg-gray-200 rounded-full dark:bg-gray-600"></li>
                                                <li className="w-full h-6 bg-gray-200 rounded-full dark:bg-gray-600"></li>
                                                <li className="w-full h-6 bg-gray-200 rounded-full dark:bg-gray-600"></li>
                                                <li className="w-full h-6 bg-gray-200 rounded-full dark:bg-gray-600"></li>
                                            </ul>
                                        </div>
                                    ) : suggestions.length > 0 ? (
                                        <AnimatePresence>
                                            <motion.ul
                                                className="space-y-4"
                                                initial="closed"
                                                animate="open"
                                                variants={{
                                                    open: {
                                                        transition: {
                                                            staggerChildren: 0.07,
                                                            delayChildren: 0.2,
                                                        },
                                                    },
                                                    closed: {
                                                        transition: {
                                                            staggerChildren: 0.05,
                                                            staggerDirection:
                                                                -1,
                                                        },
                                                    },
                                                }}
                                            >
                                                {suggestions.map(
                                                    (suggestion, index) => (
                                                        <motion.li
                                                            key={index}
                                                            className="relative p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow-lg overflow-hidden dark:from-purple-700 dark:to-pink-700 flex justify-between items-center"
                                                            variants={{
                                                                open: {
                                                                    y: 0,
                                                                    opacity: 1,
                                                                    transition:
                                                                        {
                                                                            y: {
                                                                                stiffness: 1000,
                                                                                velocity:
                                                                                    -100,
                                                                            },
                                                                        },
                                                                },
                                                                closed: {
                                                                    y: 50,
                                                                    opacity: 0,
                                                                    transition:
                                                                        {
                                                                            y: {
                                                                                stiffness: 1000,
                                                                            },
                                                                        },
                                                                },
                                                            }}
                                                        >
                                                            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-emerald-400 opacity-30 animate-pulse dark:from-blue-600 dark:to-emerald-600"></div>
                                                            <div className="relative z-10 text-white font-medium flex-grow mr-4">
                                                                {suggestion}
                                                            </div>
                                                            <button
                                                                onClick={() =>
                                                                    handleContinueWithSuggestion(
                                                                        suggestion
                                                                    )
                                                                }
                                                                className="relative z-10 px-3 py-1 bg-white text-purple-600 rounded-full text-sm font-semibold hover:bg-purple-100 transition-colors duration-200 dark:bg-gray-800 dark:text-purple-400 dark:hover:bg-gray-700"
                                                            >
                                                                <ArrowRightIcon className="h-5 w-5" />
                                                            </button>
                                                            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt dark:from-purple-800 dark:to-pink-800"></div>
                                                        </motion.li>
                                                    )
                                                )}
                                            </motion.ul>
                                        </AnimatePresence>
                                    ) : null}
                                </div>
                            </div>
                        </DialogPanel>
                    )}
                </div>
            </div>
        </Dialog>
    );
};

export default TaskHubModal;
