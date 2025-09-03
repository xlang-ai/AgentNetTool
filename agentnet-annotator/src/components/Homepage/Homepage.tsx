import { useEffect, useState } from "react";
import { Snackbar } from "@mui/joy";
import { PlayIcon } from "@heroicons/react/24/outline";
import { useMain } from "../../context/MainContext";
import TaskHubModal from "../TaskHub/TaskHubModal";
import { StopIcon } from "@heroicons/react/24/solid";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
export default function Homepage() {
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [openTaskHub, setOpenTaskHub] = useState(false);
    const [message, setMessage] = useState("");
    const [severity, setSeverity] = useState("success");
    const [genWindowA11y, setGenWindowA11y] = useState(false);
    const {
        isRecording,
        setIsRecording,
        SocketService,
        username,
        fetchTasks,
        addNewRecording,
        HubTaskId,
        setHubTaskId,
        HubTaskName,
        setHubTaskName,
        setHubTaskDescription,
        HubTaskDescription,
        myos,
        userData,
    } = useMain();
    const [loading, setLoading] = useState(false);

    const handleRecordClick = () => {
        if (!loading) {
            ToggleRecord(); // 假设这个函数会处理录制逻辑
        }
    };
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

    const ToggleRecord = () => {
        // Removed login checks - allow recording without authentication
        setLoading(true);
        console.log(username);
        if (!isRecording) {
            window.electron.ipcRenderer.sendMessage("start-record-icon");
            SocketService.GetWithParams("start_record", {
                task_hub_data: {
                    hub_task_id: HubTaskId,
                    hub_task_name: HubTaskName,
                    hub_task_description: HubTaskDescription,
                },
            })
                .then((data) => {
                    console.log("Operation succeeded:", data);
                    showSuccess(data.message);
                    setIsRecording(true);
                    setLoading(false);
                    setTimeout(() => {
                        window.electron.ipcRenderer.sendMessage(
                            "minimize-window"
                        );
                    }, 1500);
                    setHubTaskId("");
                    setHubTaskName("");
                    setHubTaskDescription("");
                })
                .catch((error) => {
                    console.error("Operation failed:", error.message);
                    showError(error.message);
                    // 请求失败后也停止loading
                    setLoading(false);
                    setTimeout(() => {
                        window.location.reload();
                    }, 3000);
                });
            } else {
                console.log("Stop Recording");
                window.electron.ipcRenderer.sendMessage("stop-record-icon");
                SocketService.Get("stop_record")
                    .then(async (data) => {
                        console.log("Operation succeeded:", data);
                        setIsRecording(false);
                        setLoading(false);
                        
                        // Try to fetch tasks from backend, if fails use fallback
                        try {
                            await fetchTasks();
                        } catch (fetchError) {
                            console.log("fetchTasks failed, adding recording manually");
                            addNewRecording();
                        }
                    })
                    .catch((error) => {
                        console.error("Operation failed:", error.message);
                        showError(error.message);
                        setLoading(false);
                        setIsRecording(false);
                        
                        // Even if stop_record fails, try to add the recording manually
                        addNewRecording();
                    });
        }
    };

    const handleWindowA11yChange = () => {
        SocketService.Send("toggle_generate_window_a11y", {
            flag: !genWindowA11y,
        });
        setGenWindowA11y(!genWindowA11y);
    };
    useEffect(() => {
        SocketService.Send("toggle_generate_window_a11y", {
            flag: false,
        });
        setGenWindowA11y(false);
    }, []);

    const handleOpenTaskHub = () => {
        setOpenTaskHub(true);
    };

    const handleCloseTaskHub = () => {
        setOpenTaskHub(false);
    };

    return (
        <div className="bg-white w-full dark:bg-gray-900">
            <div className="relative isolate">
                <div
                    className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
                    aria-hidden="true"
                >
                    <div
                        className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
                        style={{
                            clipPath:
                                "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
                        }}
                    />
                </div>
                <div className="pt-16  pb-4 sm:pt-24 ">
                    <div className="mx-auto max-w-7xl px-6 lg:px-8">
                        <div className="mx-auto max-w-6xl text-center">
                            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl dark:text-gray-100">
                                AgentNet Tool : Scaling Multimodal Computer
                                Agent Data to 1M+ Trajectories
                            </h1>
                            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
                                🚀 AgentNet Tool is a customized toolkit for
                                users to label agent tasks data for collection.
                            </p>
                            <p className="mt-0 text-lg leading-8 text-gray-600 dark:text-gray-300">
                                📌 We are shaping the future of digital agents
                                with 1M+ data!
                            </p>
                        </div>
                    </div>
                </div>
                <div
                    className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
                    aria-hidden="true"
                >
                    <div
                        className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
                        style={{
                            clipPath:
                                "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
                        }}
                    />
                </div>
            </div>
            <div className="mx-auto max-w-7xl px-6 lg:px-8 pb-40">
                {/* Add this new section to display task information */}
                {(HubTaskName || HubTaskDescription) && (
                    <div className="mx-auto mt-8 max-w-xl sm:mt-10 lg:mt-12 lg:max-w-2xl">
                        <div className="bg-indigo-50 dark:bg-indigo-900 border border-indigo-200 dark:border-indigo-700 rounded-lg p-4">
                            <h2 className="text-base font-semibold text-indigo-800 dark:text-indigo-200 mb-2">
                                Current Task:{" "}
                                {HubTaskName && (
                                    <p className="inline text-md text-indigo-700 dark:text-indigo-300 font-medium">
                                        {HubTaskName}
                                    </p>
                                )}
                            </h2>

                            {HubTaskDescription && (
                                <p className="text-indigo-600 dark:text-indigo-400 mt-2">
                                    {HubTaskDescription}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                <div className="mx-auto mt-8 max-w-xl sm:mt-10 lg:mt-12 lg:max-w-2xl">
                    <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-6 lg:max-w-none lg:grid-cols-1 lg:gap-y-8">
                        <div
                            id="recording"
                            className={`relative pl-16 border rounded-lg p-4 cursor-pointer border-2
                ${
                    isRecording
                        ? "border-rose-600 bg-rose-100 dark:border-rose-600 dark:bg-rose-900"
                        : "border-indigo-100 hover:border-indigo-600 dark:border-indigo-600 dark:hover:border-indigo-600"
                } 
                ${loading ? "opacity-50 cursor-not-allowed" : ""}
                dark:border-gray-600 dark:hover:border-indigo-600`}
                            onClick={handleRecordClick}
                        >
                            <dt className="flex flex-col gap-1 flex-start text-lg font-semibold leading-7 text-gray-900 dark:text-gray-300">
                                <div
                                    className={`absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-lg 
                    ${isRecording ? "bg-rose-600" : "bg-indigo-600"} 
                `}
                                >
                                    {loading ? (
                                        <div
                                            className="animate-spin inline-block size-6 border-[3px] border-current border-t-transparent text-blue-600 rounded-full dark:text-blue-500"
                                            role="status"
                                            aria-label="loading"
                                        >
                                            <span className="sr-only">
                                                Loading...
                                            </span>
                                        </div>
                                    ) : (
                                        <>
                                            {isRecording ? (
                                                <StopIcon
                                                    className="h-6 w-6 text-white"
                                                    aria-hidden="true"
                                                />
                                            ) : (
                                                <PlayIcon
                                                    className="h-6 w-6 text-white"
                                                    aria-hidden="true"
                                                />
                                            )}
                                        </>
                                    )}
                                </div>
                                {loading ? (
                                    <p>Processing...</p>
                                ) : myos === "darwin" ? (
                                    <span className="flex flex-wrap items-center gap-x-1 text-sm text-gray-600 dark:text-neutral-400">
                                        <p className="text-lg font-semibold leading-7 text-gray-900 dark:text-gray-300 mr-4">
                                            {isRecording
                                                ? "Stop Recording"
                                                : "Start Recording"}
                                        </p>
                                        <kbd className="min-h-[30px] min-w-[30px] inline-flex justify-center items-center py-1 px-1.5 bg-gray-200 border border-gray-300 font-mono text-sm text-gray-800 rounded-md dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200">
                                            <svg
                                                className="shrink-0 size-3"
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="24"
                                                height="24"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                stroke-width="2"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                            >
                                                <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"></path>
                                            </svg>
                                        </kbd>
                                        +
                                        <kbd className="min-h-[30px] min-w-[30px] inline-flex justify-center items-center py-1 px-1.5 bg-gray-200 border border-gray-300 font-mono text-sm text-gray-800 rounded-md dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200">
                                            <svg
                                                className="shrink-0 size-3"
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="24"
                                                height="24"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                stroke-width="2"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                            >
                                                <path d="M3 3h6l6 18h6"></path>
                                                <path d="M14 3h7"></path>
                                            </svg>
                                        </kbd>
                                        +
                                        {isRecording ? (
                                            <kbd className="min-h-[30px] min-w-[30px] inline-flex justify-center items-center py-1 px-1.5 bg-gray-200 border border-gray-300 font-mono text-sm text-gray-800 rounded-md dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200">
                                                T
                                            </kbd>
                                        ) : (
                                            <kbd className="min-h-[30px] min-w-[30px] inline-flex justify-center items-center py-1 px-1.5 bg-gray-200 border border-gray-300 font-mono text-sm text-gray-800 rounded-md dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200">
                                                R
                                            </kbd>
                                        )}
                                    </span>
                                ) : (
                                    <span className="flex flex-wrap items-center gap-x-1 text-sm text-gray-600 dark:text-neutral-400">
                                        <p className="text-lg font-semibold leading-7 text-gray-900 dark:text-gray-300 mr-4">
                                            {isRecording
                                                ? "Stop Recording"
                                                : "Start Recording"}
                                        </p>
                                        <kbd className="min-h-[30px] min-w-[30px] inline-flex justify-center items-center py-1 px-1.5 bg-gray-200 border border-gray-300 font-mono text-sm text-gray-800 rounded-md dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200">
                                            ctrl
                                        </kbd>
                                        +
                                        <kbd className="min-h-[30px] min-w-[30px] inline-flex justify-center items-center py-1 px-1.5 bg-gray-200 border border-gray-300 font-mono text-sm text-gray-800 rounded-md dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200">
                                            alt
                                        </kbd>
                                        +
                                        {isRecording ? (
                                            <kbd className="min-h-[30px] min-w-[30px] inline-flex justify-center items center py-1 px-1.5 bg-gray-200 border border-gray-300 font-mono text-sm text-gray-800 rounded-md dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200">
                                                T
                                            </kbd>
                                        ) : (
                                            <kbd className="min-h-[30px] min-w-[30px] inline-flex justify-center items-center py-1 px-1.5 bg-gray-200 border border-gray-300 font-mono text-sm text-gray-800 rounded-md dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200">
                                                R
                                            </kbd>
                                        )}
                                    </span>
                                )}
                            </dt>
                            <dd className="mt-2 text-base leading-7 text-gray-600 dark:text-gray-300"></dd>
                        </div>
                    </dl>
                </div>
                <div className="mx-auto mt-2 max-w-xl sm:mt-4 lg:mt-6 lg:max-w-2xl">
                    <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-6 lg:max-w-none lg:grid-cols-1 lg:gap-y-8">
                        <div
                            className="relative pl-16 border border-gray-300 rounded-lg hover:border-indigo-600 p-4 dark:border-gray-600 dark:hover:border-indigo-600"
                            onClick={() => handleOpenTaskHub()}
                        >
                            <dt className="text-lg font-semibold leading-7">
                                <div className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                                    <AutoFixHighIcon
                                        aria-hidden="true"
                                        className="h-6 w-6 text-white"
                                        style={{ color: "white" }}
                                    />
                                </div>
                                Random Task
                            </dt>
                            <dd className="mt-1 text-base leading-7 text-gray-600 dark:text-gray-300">
                                Randomly select a task from the our task hub
                                with detailed tutorial.
                            </dd>
                        </div>
                    </dl>
                </div>
                <div className="mx-auto mt-8 max-w-xl sm:mt-10 lg:mt-12 lg:max-w-2xl">
                    <fieldset className="space-x-10">
                        <div className="space-y-5 space-x-10 mx-10">
                            <div className="relative flex items-start">
                                <div className="flex h-6 items-center">
                                    <input
                                        id="comments"
                                        aria-describedby="comments-description"
                                        name="comments"
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                        checked={genWindowA11y}
                                        onChange={handleWindowA11yChange}
                                    />
                                </div>
                                <div className="ml-3 text-sm leading-6">
                                    <label
                                        htmlFor="comments"
                                        className="font-medium text-gray-900 dark:text-gray-300"
                                    >
                                        Get Accessibility Tree
                                    </label>
                                    <p
                                        id="comments-description"
                                        className="text-gray-500 dark:text-gray-400"
                                    >
                                        Get the accessibility tree of the
                                        current window.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </fieldset>
                </div>
            </div>{" "}
            <Snackbar
                open={openSnackbar}
                autoHideDuration={5000}
                onClose={() => setOpenSnackbar(false)}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
                color={severity === "success" ? "success" : "warning"}
            >
                {message}
            </Snackbar>
            <TaskHubModal open={openTaskHub} onClose={handleCloseTaskHub} />
        </div>
    );
}
