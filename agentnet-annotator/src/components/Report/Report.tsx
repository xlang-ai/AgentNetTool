import { useEffect, useState } from "react";
import { Snackbar } from "@mui/joy";
import { PlayIcon } from "@heroicons/react/24/outline";
import TakeoutDiningIcon from "@mui/icons-material/TakeoutDining";
import { useMain } from "../../context/MainContext";
import { PhotoIcon, UserCircleIcon, XMarkIcon } from '@heroicons/react/24/solid'
import { Hub } from "@mui/icons-material";
import { set } from "date-fns";
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid';

export default function Report() {
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [openTaskHub, setOpenTaskHub] = useState(false);
    const [message, setMessage] = useState("");
    const [severity, setSeverity] = useState<"success" | "warning">("success");
    const [genWindowA11y, setGenWindowA11y] = useState(false);
    const [genElementA11y, setGenElementA11y] = useState(true);
    const [tasks, setTasks] = useState([]);
    const [selectedTask, setSelectedTask] = useState("");
    const [description, setDescription] = useState("");
    const [uploadedImage, setUploadedImage] = useState(""); //base64
    const { isRecording, setIsRecording, SocketService, user_id, username, fetchTasks, HubTaskName, setHubTaskName, setHubTaskDescription, HubTaskDescription } =
        useMain();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            // 使用FileReader来读取文件
            const reader = new FileReader();
            reader.onloadend = () => {
                // 当读取完成后，将结果转换为Base64格式
                const base64String = reader.result as string;
                setUploadedImage(base64String);
            };
            // 将文件读取为DataURL (Base64格式)
            reader.readAsDataURL(file);
        }
    };
    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const response = await fetch(
                    "http://127.0.0.1:5328/api/recordings"
                );
                const all_tasks = await response.json();
                console.log("All Tasks:", all_tasks);
                setTasks(all_tasks["uploaded_recordings"].concat(all_tasks["not_uploaded_recordings"]));
            } catch (error) {
                console.error("Failed to fetch tasks:", error);
            }
        };
        fetchTasks();
    }, []);
    useEffect(() => {
        console.log("selectedTask:", selectedTask);
    }, [selectedTask]);
    useEffect(() => {
        console.log("description:", description);
    }, [description]);
    useEffect(() => {
        console.log("uploadedImage:", uploadedImage);
    }, [uploadedImage]);
    const handleReset = () => {
        setSelectedTask("");
        setDescription("");
        setUploadedImage("");
    }

    const showSuccess = (message: string) => {
        setOpenSnackbar(true);
        setMessage(message);
        setSeverity("success");
        setTimeout(() => {
            setOpenSnackbar(false);
        }, 3000);
    };

    const showError = (message: string) => {
        setOpenSnackbar(true);
        setMessage(message);
        setSeverity("warning");
        setTimeout(() => {
            setOpenSnackbar(false);
        }, 3000);
    };

    const handleReport = async () => {
        if (!selectedTask) {
            showError("Please select a task before submitting.");
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await SocketService.Post("report_feedback", {
                user_id: user_id,
                recording_name: selectedTask,
                feedback: description,
                screenshot: uploadedImage,
            });
            console.log("Report response:", response);
            if (response.status === "succeed") {
                showSuccess(response.message || 'Report submitted successfully');
                setSelectedTask("");
                setDescription("");
                setUploadedImage("");
            } else {
                showError(response.message || 'Failed to submit report');
            }
        } catch (error) {
            console.error("Failed to report bug:", error);
            showError('An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="h-full max-h-full overflow-y-auto w-full flex flex-col items-center  centering mx-10 my-10">
            <div className="w-4/5 space-y-10">
                <div className="pt-16  pb-4 sm:pt-24 ">
                    <div className="mx-auto max-w-7xl px-6 lg:px-8">
                        <div className="mx-auto max-w-6xl text-start">
                            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl dark:text-gray-100">
                                Bug Report
                            </h1>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-4">
                    <div className="my-4 px-4 sm:px-0">
                        <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-gray-200">Information</h2>
                        <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">
                            During our internal testing period, it's possible that you may encounter many bugs that causes the system to crash or not function properly. Please report any bugs that you encounter here. We sincerely apologize for any inconvenience caused.
                        </p>
                    </div>

                    <form className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-3 dark:bg-gray-800">
                        <div className="px-4 py-6 sm:p-8">
                            <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                                <div className="sm:col-span-6">
                                    <label htmlFor="task" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">
                                        Task
                                    </label>
                                    <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">
                                        Please tell us which task that you recorded encountered severe problems.
                                    </p>
                                    <div className="mt-2">
                                        <select
                                            id="task"
                                            name="task"
                                            autoComplete="task-name"
                                            value={selectedTask}
                                            onChange={(e) => setSelectedTask(e.target.value)}
                                            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-gray-700 dark:text-gray-200 dark:ring-gray-600"
                                        >
                                            <option value="">Please select a task</option>
                                            {tasks.map((task) => (
                                                <option key={task.name} value={task.name}>{task.task_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="sm:col-span-6">
                                    <label htmlFor="description" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">
                                        Description (Optional)
                                    </label>
                                    <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">
                                        If feasible, please leave a few sentences to briefly describe your situation.
                                    </p>
                                    <div className="mt-2">
                                        <textarea
                                            id="description"
                                            name="description"
                                            rows={3}
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-gray-700 dark:text-gray-200 dark:ring-gray-600"
                                        />
                                    </div>
                                </div>

                                <div className="sm:col-span-6">
                                    <label htmlFor="cover-photo" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">
                                        Screenshot (Optional)
                                    </label>
                                    <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">
                                        If feasible, you can also submit a screenshot to provide more details.
                                    </p>
                                    <div className="mt-2">
                                        {uploadedImage === "" ? (
                                            <div className="flex justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 py-10 dark:border-gray-600">
                                                <div className="text-center">
                                                    <PhotoIcon className="mx-auto h-12 w-12 text-gray-300" aria-hidden="true" />
                                                    <div className="mt-4 flex text-sm leading-6 text-gray-600 dark:text-gray-400">
                                                        <label
                                                            htmlFor="file-upload"
                                                            className="relative cursor-pointer rounded-md font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                                                        >
                                                            <span>Upload a file</span>
                                                            <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} />
                                                        </label>
                                                        <p className="pl-1">or drag and drop</p>
                                                    </div>
                                                    <p className="text-xs leading-5 text-gray-600 dark:text-gray-400">PNG, JPG, GIF up to 10MB</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                <img src={uploadedImage} alt="Uploaded" className="w-full rounded-lg" />
                                                <button
                                                    type="button"
                                                    className="absolute top-2 right-2 rounded-full bg-white p-1 text-gray-400 shadow-sm hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                                    onClick={() => setUploadedImage("")}
                                                >
                                                    <span className="sr-only">Remove</span>
                                                    <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-x-6 border-t border-gray-900/10 px-4 py-4 sm:px-8 dark:border-gray-700">
                            <button
                                type="button"
                                className="text-sm font-semibold leading-6 text-gray-900 dark:text-gray-200"
                                onClick={handleReset}
                                disabled={isSubmitting}
                            >
                                Reset
                            </button>
                            <button
                                type="button"
                                className={`rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${isSubmitting
                                    ? 'bg-indigo-400 cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-500'
                                    }`}
                                onClick={handleReport}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            <Snackbar
                open={openSnackbar}
                autoHideDuration={3000}
                onClose={() => setOpenSnackbar(false)}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
                color={severity}
            >
                {message}
            </Snackbar>
        </div>
    );
}
