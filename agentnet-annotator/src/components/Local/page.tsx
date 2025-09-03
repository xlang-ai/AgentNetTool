import * as React from "react";
import { useCallback, useEffect, useRef, useState, ReactNode } from "react";
import {
    Link as RouterLink,
    useBlocker,
    useLoaderData,
    useNavigate,
} from "react-router-dom";
import {
    Dialog,
    DialogBackdrop,
    DialogPanel,
    DialogTitle,
} from "@headlessui/react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import {
    Box,
    Button,
    Breadcrumbs,
    Link,
    Tabs,
    AspectRatio,
    TabList,
    TabPanel,
    Badge,
    Stepper,
    Snackbar,
    Chip,
    Grid,
    Stack,
    SvgIcon,
    Alert,
    LinearProgress,
    Typography,
    StepIndicator,
    Step,
    Tab,
    Slider,
    Card,
} from "@mui/joy";
import Popper from "@mui/material/Popper";
import { tabClasses } from "@mui/joy/Tab";
import { stepClasses } from "@mui/joy/Step";
import { stepIndicatorClasses } from "@mui/joy/StepIndicator";
import { typographyClasses } from "@mui/joy/Typography";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import CreateIcon from "@mui/icons-material/Create";
import DeleteIcon from "@mui/icons-material/Delete";
import Check from "@mui/icons-material/Check";
import { default as _ReactPlayer } from "react-player/lazy";
import { ReactPlayerProps } from "react-player/types/lib";
import ClearIcon from "@mui/icons-material/Clear";
import { useMain } from "../../context/MainContext";
import "react-edit-text/dist/index.css";
import EditableText from "../utils/EditableTextArea";
import { SERVER_URL } from "../../public/constant";
import ReactJson from "@microlink/react-json-view";
const ReactPlayer = _ReactPlayer as unknown as React.FC<ReactPlayerProps>;
export const Title2String = (
    action: string,
    element: Record<string, any>,
    element2: Record<string, any>,
    element3: Record<string, any>
) => {
    if (element && element.mark) {
        if (action == "click") {
            if (element) {
                if (element.title) {
                    return `Click on ${element.title}`;
                } else if (element.value && !/\d/.test(element.value)) {
                    return `Click on ${element.value}`;
                } else if (element.description) {
                    return `Click on ${element.description}`;
                } else if (element.role) {
                    return `Click on ${element.role}`;
                } else if (element.role_description) {
                    return `Click on ${element.role_description}`;
                }
            }
            return "Click";
        } else if (action == "drag") {
            if (element) {
                if (element.title) {
                    return `Drag to ${element.title}`;
                }
                // element.value存在并且不不带任何数字
                else if (element.value && !/\d/.test(element.value)) {
                    return `Click on ${element.value}`;
                } else if (element.description) {
                    return `Drag to ${element.description}`;
                } else if (element.role) {
                    return `Drag to ${element.role}`;
                } else if (element.role_description) {
                    return `Drag to ${element.role_description}`;
                }
            }
            return "Drag";
        } else if (action == "scroll") {
            return "Scroll";
        } else if (action == "type") {
            return "Type";
        } else if (action == "press") {
            return "Press";
        } else {
            return action;
        }
    } else if (element2 && element2.mark) {
        if (action == "click") {
            if (element2) {
                if (element2.title) {
                    return `Click on ${element2.title}`;
                } else if (element2.value && !/\d/.test(element2.value)) {
                    return `Click on ${element2.value}`;
                } else if (element2.description) {
                    return `Click on ${element2.description}`;
                } else if (element2.role) {
                    return `Click on ${element2.role}`;
                } else if (element2.role_description) {
                    return `Click on ${element2.role_description}`;
                }
            }
            return "Click";
        } else if (action == "drag") {
            if (element2) {
                if (element2.title) {
                    return `Drag to ${element2.title}`;
                }
                // element.value存在并且不不带任何数字
                else if (element2.value && !/\d/.test(element2.value)) {
                    return `Click on ${element2.value}`;
                } else if (element2.description) {
                    return `Drag to ${element2.description}`;
                } else if (element2.role) {
                    return `Drag to ${element2.role}`;
                } else if (element2.role_description) {
                    return `Drag to ${element2.role_description}`;
                }
            }
            return "Drag";
        } else if (action == "scroll") {
            return "Scroll";
        } else if (action == "type") {
            return "Type";
        } else if (action == "press") {
            return "Press";
        } else {
            return action;
        }
    } else if (element3) {
        if (action == "click") {
            if (element3) {
                if (element3.title) {
                    return `Click on ${element3.title}`;
                } else if (element3.value && !/\d/.test(element3.value)) {
                    return `Click on ${element3.value}`;
                } else if (element3.description) {
                    return `Click on ${element3.description}`;
                } else if (element3.role) {
                    return `Click on ${element3.role}`;
                } else if (element3.role_description) {
                    return `Click on ${element3.role_description}`;
                }
            }
            return "Click";
        } else if (action == "drag") {
            if (element3) {
                if (element3.title) {
                    return `Drag to ${element3.title}`;
                }
                // element.value存在并且不不带任何数字
                else if (element3.value && !/\d/.test(element3.value)) {
                    return `Click on ${element3.value}`;
                } else if (element3.description) {
                    return `Drag to ${element3.description}`;
                } else if (element3.role) {
                    return `Drag to ${element3.role}`;
                } else if (element3.role_description) {
                    return `Drag to ${element3.role_description}`;
                }
            }
            return "Drag";
        } else if (action == "scroll") {
            return "Scroll";
        } else if (action == "type") {
            return "Type";
        } else if (action == "press") {
            return "Press";
        } else {
            return action;
        }
    } else {
        return action;
    }
};
interface KeyboardKeyProps {
    children: ReactNode;
}

interface DisplayTextareaProps {
    value: string;
    index: number;
}

export interface eventProp {
    time_stamp: number;
    action: string;
    x: number | null;
    y: number | null;
    button: string | null;
    pressed: boolean | null;
    click_type: string | null;
    id: number;
    element: Record<string, any> | null;
    target: Record<string, any> | null;
    past_frame_target: Record<string, any> | null;
    gpt_target: Record<string, any> | null;
    drag_x: number | null;
    drag_y: number | null;
    drag_to_timestamp: number | null;
    track: [[number, number]] | null;
    name: string | null;
    image: string | null; //base64 code to string
    imagegroup: [string] | null;
    description: string | null; //one-sentence description of the event
    element_text: string | null;
    axtree: Record<string, any> | null;
}

interface statusProp {
    recording_id: string;
    uploaded: boolean;
    confirmed: boolean;
}

interface VideoDict {
    [key: number]: string;
}

const Page = () => {
    const [recordingName, setRecordingName] = useState("");
    const [taskName, setTaskName] = useState("");
    const [description, setDescription] = useState("");
    const [eventsList, setEventsList] = useState<eventProp[]>([]);
    const eventsListLengthRef = useRef(eventsList.length);
    const [recordingStatus, setRecordingStatus] = useState<statusProp>({
        recording_id: "",
        uploaded: false,
        confirmed: false,
    });
    const [taskId, setTaskId] = useState("");
    const [activeStep, setActiveStep] = React.useState(0); //被展示的index
    const [index, setIndex] = React.useState(0);
    const [scrollDelta, setScrollDelta] = useState<number>(0);
    const [videoClipSrcDict, setVideoClipSrcDict] = useState<VideoDict>({});
    const [videoClipSrc, setVideoClipSrc] = useState("");
    const [fullVideoSrc, setFullVideoSrc] = useState("");
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [message, setMessage] = useState("");
    const [severity, setSeverity] = useState("success"); // 'success', 'error', 'warning', 'neutral'
    const [isEditing, setIsEditing] = useState(eventsList.map(() => false));
    const [playing, setPlaying] = useState(true);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [duration, setDuration] = useState(0);

    const [valMin, setValMin] = useState<number>(1);
    const [valMax, setValMax] = useState<number>(2);
    const [inputValMin, setInputValMin] = useState<number>(1);
    const [inputValMax, setInputValMax] = useState<number>(2);

    const [popOpen, setPopOpen] = useState(false);
    const [cutTaskName, setCutTaskName] = useState("");
    const [cutDescription, setCutDescription] = useState("");
    const [worker, setWorker] = useState<Worker | null>(null);
    const cutButtonRef = useRef(null);
    const cutPopperRef = useRef(null);
    const { fetchTasks, fetchUserData, SocketService } = useMain();
    const scrollThreshold = 100;
    const stepperRef = useRef<HTMLDivElement>(null);
    const recordingData: any = useLoaderData();
    const navigate = useNavigate();
    const [operationHistory, setOperationHistory] = useState<any[]>([]); // Stack for undo operations
    const [redoStack, setRedoStack] = useState<any[]>([]); // Stack for redo operations (optional)
    const [dirty, setIsDirty] = useState(false);
    // Block navigating elsewhere when data has been entered into the input
    let blocker = useBlocker(({ currentLocation, nextLocation }) => dirty);
    useEffect(() => {
        return () => {
            if (worker) {
                worker?.terminate();
            }
        };
    }, [worker]);

    // useEffect(() => {
    //     const fetchHubData = async () => {
    //         try {
    //             const response = await fetch(
    //                 `http://localhost:5328/api/recording/${recordingName}/hub_data`
    //             );
    //             if (!response.ok) {
    //                 throw new Error("Network response was not ok");
    //             }
    //             const resjson = await response.json();
    //             console.log(resjson);
    //             if (resjson.success) {
    //                 setTaskName(resjson.hub_task_name);
    //                 setDescription(resjson.hub_task_description);
    //                 setCutTaskName(resjson.hub_task_name);
    //                 setCutDescription(resjson.hub_task_description);
    //             }
    //         } catch (error) {
    //             console.error("Error fetching hub data:", error);
    //         }
    //     };
    //     fetchHubData();
    // }, []);
    useEffect(() => {
        if (videoClipSrcDict[activeStep]) {
            setVideoClipSrc(videoClipSrcDict[activeStep]);
        }
    }, [videoClipSrcDict, activeStep]);

    useEffect(() => {
        console.log(recordingData);
        setRecordingName(recordingData.recording_name as string);
        setTaskName(recordingData.task_data.task_name as string);
        setCutTaskName(recordingData.task_data.task_name as string);
        setDescription(recordingData.task_data.description as string);
        setEventsList(recordingData.task_data.events as eventProp[]);
        setTaskId(recordingData.task_data.recording_id as string);
        console.log("events:", recordingData.task_data.events);
        setRecordingStatus(
            recordingData.task_data.recording_status as statusProp
        );
        setActiveStep(0);
        setCutTaskName("");
        setCutDescription("");
    }, [recordingData]);

    useEffect(() => {
        setIndex(0); // display
        const fetchVideoClip = async (index: number) => {
            try {
                const response = await fetch(
                    `http://localhost:5328/api/video/${recordingName}/${index}`,
                    {
                        headers: {
                            "Cache-Control": "no-cache",
                        },
                    }
                );
                if (!response.ok) {
                    //throw new Error("Network response was not ok");
                    showError(
                        "Error fetching video, or reduction hasn't been completed yet"
                    );
                    setTimeout(() => {
                        navigate("/");
                    }, 2000);
                }
                const resjson = await response.json();
                const path = resjson.path;
                setVideoClipSrcDict((prevDict) => ({
                    ...prevDict,
                    [index]: path,
                }));
            } catch (error) {
                console.error("Error fetching video:", error);
            }
        };
        const fetchFullVideo = async () => {
            try {
                const response = await fetch(
                    `http://localhost:5328/api/fullvideo/${recordingName}`, // we cannot identify fetchVideoClip and fetchFullVideo if only the suffix is different
                    {
                        headers: {
                            "Cache-Control": "no-cache",
                        },
                    }
                );
                if (!response.ok) {
                    throw new Error("Network response was not ok");
                }
                const resjson = await response.json();
                const path = resjson.path;
                setFullVideoSrc(path);
            } catch (error) {
                console.error("Error fetching video:", error);
            }
        };
        if (recordingName != "") {
            setVideoClipSrcDict({});
            // TODO: fetch based on needs
            for (let i = 0; i < eventsList.length; i++) {
                fetchVideoClip(i);
            }
            fetchFullVideo();
        }
        setPopOpen(false);
    }, [recordingName]);

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
        setSeverity("error");
        setTimeout(() => {
            setOpenSnackbar(false);
        }, 3000);
    };

    const showInfo = (message: string) => {
        setOpenSnackbar(true);
        setMessage(message);
        setSeverity("neutral");
        setTimeout(() => {
            setOpenSnackbar(false);
        }, 3000);
    };

    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (event.key === "ArrowUp" && activeStep > 0) {
                setActiveStep((prev) => prev - 1);
            } else if (
                event.key === "ArrowDown" &&
                activeStep < eventsList.length - 1
            ) {
                setActiveStep((prev) => prev + 1);
            }
        },
        [activeStep, eventsList.length]
    );

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [handleKeyDown]);

    useEffect(() => {
        if (stepperRef.current) {
            const stepperHeight = stepperRef.current.offsetHeight;
            const stepHeight =
                stepperRef.current.scrollHeight / eventsList.length;
            const offset =
                stepHeight * activeStep - stepperHeight / 2 + stepHeight / 2;
            stepperRef.current.scrollTo({
                top: offset,
                behavior: "smooth",
            });
        }
        eventsListLengthRef.current = eventsList.length;
        if (
            eventsListLengthRef.current < valMax &&
            eventsListLengthRef.current != 0
        ) {
            setValMax(eventsListLengthRef.current);
        }
    }, [activeStep]);

    useEffect(() => {
        eventsListLengthRef.current = eventsList.length;
        setValMax(eventsListLengthRef.current);
        setInputValMax(eventsListLengthRef.current);
    }, [eventsList.length]);

    const KeyboardKey: React.FC<KeyboardKeyProps> = ({ children }) => (
        <Chip
            variant="outlined"
            size="sm"
            sx={{
                borderRadius: "3px",
                padding: "0px 5px",
                margin: "0 2px",
                backgroundColor: "#f7f7f7",
                fontSize: "0.72rem",
                height: "16px",
                lineHeight: "16px",
                alignItems: "flex-start",
            }}
        >
            {children}
        </Chip>
    );

    const DisplayTextarea: React.FC<DisplayTextareaProps> = ({
        value,
        index,
    }) => {
        return (
            <div
                style={{
                    whiteSpace: "pre-wrap",
                    overflow: "hidden",
                }}
                onClick={() => handleEdit(index)}
                className="text-xs text-slate-600 dark:text-slate-400 my-1 p-0 text-warp"
            >
                {replaceWithKeyboardKeys(value)}
            </div>
        );
    };

    const replaceWithKeyboardKeys = (text: string) => {
        const regex = /\$(.*?)\$/g;
        const parts = text.split(regex);

        return parts.map((part: string, index: number) => {
            if (index % 2 === 1) {
                return <KeyboardKey key={index}>{part}</KeyboardKey>;
            }
            return part;
        });
    };

    const handleWheel = useCallback(
        (event: React.WheelEvent<HTMLDivElement>) => {
            event.preventDefault();
            setScrollDelta((prev) => prev + event.deltaY);

            if (scrollDelta <= -scrollThreshold && activeStep > 0) {
                setActiveStep((prev) => prev - 1);
                setScrollDelta(0);
            } else if (
                scrollDelta >= scrollThreshold &&
                activeStep < eventsList.length - 1
            ) {
                setActiveStep((prev) => prev + 1);
                setScrollDelta(0);
            }
        },
        [scrollDelta, activeStep, eventsList.length]
    );

    // Handle delete event
    const handleDeleteEvent = (index: number) => {
        const newEventsList = [...eventsList];
        const removedEvent = newEventsList.splice(index, 1)[0];

        // Create a snapshot of the current state
        const newVideoClipSrcDict = { ...videoClipSrcDict };
        for (
            let key = index;
            key < Object.keys(newVideoClipSrcDict).length - 1;
            key++
        ) {
            newVideoClipSrcDict[key] = newVideoClipSrcDict[key + 1];
        }
        const lastKey = Object.keys(newVideoClipSrcDict).length - 1;
        delete newVideoClipSrcDict[lastKey];

        // Save the operation to history for undo and clear redo stack
        setOperationHistory([
            ...operationHistory,
            {
                type: "delete",
                event: removedEvent,
                index: index,
                videoClipSrcDict: videoClipSrcDict,
            },
        ]);
        setRedoStack([]); // Clear the redo stack on new action

        // Apply changes
        setEventsList(newEventsList);
        setVideoClipSrcDict(newVideoClipSrcDict);
        showInfo(`Event ${index + 1} deleted`);
        setIsDirty(true);
    };

    // Handle change event
    const handleChange = (e: any, index: number, key: string) => {
        const newEventsList = [...eventsList];
        const prevEvent = { ...newEventsList[index] };

        if (key === "action") {
            newEventsList[index].action = e;
        } else if (key === "description") {
            newEventsList[index].description = e;
        }

        // Save the operation to history for undo and clear redo stack
        setOperationHistory([
            ...operationHistory,
            {
                type: "change",
                prevEvent: prevEvent,
                newEvent: newEventsList[index],
                index: index,
            },
        ]);
        setRedoStack([]); // Clear the redo stack on new action

        // Apply changes
        setEventsList(newEventsList);
        setIsDirty(true);
    };

    // Undo the last operation
    const handleUndo = () => {
        if (operationHistory.length === 0) {
            return;
        }

        const lastOperation = operationHistory.pop();
        setOperationHistory([...operationHistory]);

        if (lastOperation.type === "delete") {
            // Restore the deleted event
            const newEventsList = [...eventsList];
            newEventsList.splice(lastOperation.index, 0, lastOperation.event);
            setEventsList(newEventsList);

            // Restore the video clip dictionary
            setVideoClipSrcDict(lastOperation.videoClipSrcDict);
        } else if (lastOperation.type === "change") {
            // Revert the change
            const newEventsList = [...eventsList];
            newEventsList[lastOperation.index] = lastOperation.prevEvent;
            setEventsList(newEventsList);
        }

        // Save the undone operation to redo stack
        setRedoStack([...redoStack, lastOperation]);
        setIsDirty(true);
    };

    // Redo the last undone operation
    const handleRedo = () => {
        if (redoStack.length === 0) {
            return;
        }

        const lastUndoOperation = redoStack.pop();
        setRedoStack([...redoStack]);

        if (lastUndoOperation.type === "delete") {
            // Redo the delete event
            handleDeleteEvent(lastUndoOperation.index);
        } else if (lastUndoOperation.type === "change") {
            // Redo the change event
            const newEventsList = [...eventsList];
            newEventsList[lastUndoOperation.index] = lastUndoOperation.newEvent;
            setEventsList(newEventsList);

            // Save the redo operation to history
            setOperationHistory([...operationHistory, lastUndoOperation]);
        }
        setIsDirty(true);
    };

    const handleDeleteRecording = async () => {
        try {
            const response = await fetch(
                `http://localhost:5328/api/recording/${recordingName}/delete_local_recording`
            );
            const result = await response.json();

            if (response.ok) {
                showSuccess(result.success);
            } else {
                showError(result.error);
            }
        } catch (error) {
            showError("Network error or server is down.");
        } finally {
            showInfo(`Task ${taskName} deleted`);
            fetchTasks();
            setTimeout(() => {
                navigate("/");
            }, 1000);
        }
    };

    const onSave = async () => {
        handleConfirmRecording();
        setIsDirty(false);
        blocker.proceed();
    };
    const onCancel = () => {
        setIsDirty(false);
        blocker.proceed();
    };
    const handleConfirmRecording = async () => {
        const confirmResponse = await fetch(
            `http://localhost:5328/api/recording/${recordingName}/confirm`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(eventsList),
            }
        );
        const confirmResult = await confirmResponse.json();
        if (confirmResponse.ok) {
            showSuccess(confirmResult.success);
        } else {
            showError(confirmResult.error);
        }
    };

    const handleUploadRecording = async () => {
        console.log(eventsList);
        const confirmResponse = await fetch(
            `http://localhost:5328/api/recording/${recordingName}/confirm`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(eventsList),
            }
        );
        const confirmResult = await confirmResponse.json();

        if (confirmResponse.ok) {
            setIsUploading(true);
            setUploadProgress(0);
            console.log(duration);
            let estimatedTime = 0;
            if (duration !== 0) estimatedTime = 50 * duration;
            else estimatedTime = 50;
            const intervalTime = 100;
            let progress = 0;

            const interval = setInterval(() => {
                progress += intervalTime * (1 - progress / estimatedTime);
                const calculatedProgress = (progress / estimatedTime) * 100;

                if (calculatedProgress >= 99) {
                    clearInterval(interval);
                    setUploadProgress(99);
                } else setUploadProgress(calculatedProgress);
            }, intervalTime);

            SocketService.Post("upload_recording", {
                recording_name: recordingName,
            })
                .then((data) => {
                    console.log(
                        `Uploading ${data.recording_name} successfully`
                    );
                    showSuccess(
                        `Uploading ${data.recording_name} successfully`
                    );
                    clearInterval(interval);
                    setUploadProgress(100);
                    setIsUploading(false);
                    setRecordingStatus({ ...recordingStatus, uploaded: true });
                    setIsDirty(false);
                    fetchTasks();
                    fetchUserData();
                })
                .catch((error) => {
                    console.error(
                        `Failed in uploading ${error.recording_name} `
                    );
                    showError(`Failed in uploading ${error.recording_name} `);
                    clearInterval(interval);
                    setUploadProgress(0);
                    setIsUploading(false);
                });
        } else {
            showError(confirmResult.error);
        }
    };

    // METHOD2: use Worker to upload
    // const handleUploadRecording = () => {
    //     if (!worker) {
    //         setIsUploading(true);
    //         setUploadProgress(0);
    //         const estimatedTime = 50 * duration;
    //         const intervalTime = 100;
    //         let progress = 0;

    //         const interval = setInterval(() => {
    //             progress += intervalTime * (1 - progress / (5 * estimatedTime));
    //             const calculatedProgress = (progress / estimatedTime) * 100;
    //             setUploadProgress(calculatedProgress);
    //             if (calculatedProgress >= 99) {
    //                 clearInterval(interval);
    //                 setUploadProgress(99);
    //             }
    //         }, intervalTime);

    //         const newWorker = new Worker(worker_script);
    //         newWorker.onmessage = (event) => {
    //             switch (event.data.type) {
    //                 case "UPLOAD_STARTED":
    //                     showInfo("Upload started");
    //                     break;
    //                 case "UPLOAD_SUCCESS":
    //                     showSuccess(`Upload success: ${event.data.message}`);
    //                     clearInterval(interval);
    //                     setUploadProgress(100);
    //                     setIsUploading(false);
    //                     setRecordingStatus({
    //                         ...recordingStatus,
    //                         uploaded: true,
    //                     });
    //                     fetchTasks();
    //                     break;
    //                 case "UPLOAD_ERROR":
    //                     showError(`Upload error: ${event.data.error}`);
    //                     clearInterval(interval);
    //                     setUploadProgress(0);
    //                     setIsUploading(false);
    //                     break;
    //                 case "CONFIRM_ERROR":
    //                     showError(`Confirm error: ${event.data.error}`);
    //                     clearInterval(interval);
    //                     setUploadProgress(0);
    //                     setIsUploading(false);
    //                     break;
    //                 case "NETWORK_ERROR":
    //                     showError(event.data.error);
    //                     clearInterval(interval);
    //                     setUploadProgress(0);
    //                     setIsUploading(false);
    //                     break;
    //                 default:
    //                     showInfo("Received unknown message type");
    //             }
    //         };
    //         setWorker(newWorker); // 设置新的worker
    //         // 使用新worker立即发送消息
    //         newWorker.postMessage({
    //             recordingName,
    //             eventsList,
    //             duration,
    //         });
    //     } else {
    //         // 使用现有worker发送消息
    //         worker.postMessage({
    //             recordingName,
    //             eventsList,
    //             duration,
    //         });
    //     }
    // };

    const handleEdit = (index: number) => {
        console.log(isEditing);
        const newIsEditing = [...isEditing];
        newIsEditing[index] = true;
        setIsEditing(newIsEditing);
        console.log(isEditing);
    };

    const handleVideoClipEnd = () => {
        setPlaying(false);
        setTimeout(() => {
            setPlaying(true);
        }, 500);
    };

    const handleFullVideoEnd = () => {
        setPlaying(false);
    };

    const handleDuration = (duration: number) => {
        setDuration(duration);
    };

    const handleSliderChange = (event: any, newValue: number[]) => {
        if (valMin != newValue[0]) {
            setValMin(newValue[0]);
            setInputValMin(newValue[0]);
            setActiveStep(newValue[0] - 1); // -1 because activeStep starts from 0
        }
        if (valMax != newValue[1]) {
            setValMax(newValue[1]);
            setInputValMax(newValue[1]);
            setActiveStep(newValue[1] - 1);
        }
    };

    const handleMinInputChange = (event: any) => {
        const newMin = Number(event.target.value);
        if (newMin >= 1 && newMin <= eventsList.length) {
            setInputValMin(newMin);
        } else {
            setInputValMin(1);
        }
    };

    const handleMaxInputChange = (event: any) => {
        const newMax = Number(event.target.value);
        if (newMax >= 1 && newMax <= eventsList.length) {
            setInputValMax(newMax);
        } else {
            setInputValMax(eventsList.length);
        }
    };

    const handleMinBlur = (event: any) => {
        if (inputValMin >= 1 && inputValMin <= eventsList.length) {
            setValMin(inputValMin);
            setActiveStep(inputValMin - 1);
        } else {
            setInputValMin(1);
            setActiveStep(0);
        }
    };

    const handleMaxBlur = (event: any) => {
        if (inputValMax >= 1 && inputValMax <= eventsList.length) {
            setValMax(inputValMax);
            setActiveStep(inputValMax - 1);
        } else {
            setInputValMax(1);
            setActiveStep(0);
        }
    };

    const handleCallCut = () => {
        // Cut the video based on the selected time range
        try {
            setPopOpen((prev) => !prev);
        } catch (error) {
            console.error("Error cutting task:", error);
            showError(`"Error cutting task:", ${error}`);
        }
    };

    const handleSaveCut = async () => {
        // Cut the video based on the selected time range
        try {
            // Save events before cutting
            console.log("Save before cutting");
            const confirmResponse = await fetch(
                `http://localhost:5328/api/recording/${recordingName}/confirm`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(eventsList),
                }
            );
            const confirmResult = await confirmResponse.json();
            if (!confirmResponse.ok) {
                showError(confirmResult.error);
            }
            // Cut the video
            if (cutTaskName) {
                console.log("Cutting video from", valMin, "to", valMax);
                const response = await fetch(
                    `http://localhost:5328/api/recording/${recordingName}/cut`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            cutTaskName,
                            //cutDescription,
                            valMin,
                            valMax,
                        }),
                    }
                );
                if (!response.ok) {
                    const response_json = await response.json();
                    showError(response_json.error);
                }
                fetchTasks();
                if (valMin === 1 && valMax === eventsList.length) {
                    setTaskName(cutTaskName);
                    //setDescription(cutDescription);
                }

                setPopOpen(false);
            } else {
                showError("Task name and description are required");
            }
        } catch (error) {
            console.error("Error saving task:", error);
            showError(`"Error cutting task:", ${error}`);
        }
    };

    const handleClickOutside = (event: any) => {
        if (
            cutPopperRef.current &&
            !cutPopperRef.current.contains(event.target) &&
            !cutButtonRef.current.contains(event.target)
        ) {
            setPopOpen(false);
        }
    };

    useEffect(() => {
        if (popOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [popOpen]);

    const handlePolish = async () => {
        try {
            if (cutTaskName) {
                console.log("Polish it:", cutTaskName);
                const response = await fetch(
                    `http://localhost:5328/polish_task_name_and_description`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            task_name: cutTaskName,
                            //task_description: cutDescription,
                        }),
                    }
                );
                if (!response.ok) {
                    throw new Error("Network response was not ok");
                } else {
                    const resjson = await response.json();
                    const modifiedTaskName = resjson.modified_task_name;
                    // const modifiedTaskDescription =
                    //     resjson.modified_task_description;

                    console.log(
                        "Polished:",
                        modifiedTaskName
                        //modifiedTaskDescription
                    );

                    // Update the frontend state with the polished values
                    setCutTaskName(modifiedTaskName);
                    // setCutDescription(modifiedTaskDescription);
                }
            } else {
                showError("Task name is required");
            }
        } catch (error) {
            console.error("Error polishing:", error);
            showError(`"Error polishing:", ${error}`);
        }
    };

    return (
        <div className="h-full max-h-full overflow-y-auto w-full max-w-full overflow-x-hidden flex flex-col">
            <div className="flex items-center mx-2 md:mx-4">
                <Breadcrumbs
                    size="sm"
                    aria-label="breadcrumbs"
                    separator={<ChevronRightRoundedIcon />}
                >
                    <Link
                        underline="none"
                        color="neutral"
                        aria-label="Home"
                        component={RouterLink}
                        to="/"
                    >
                        <HomeRoundedIcon />
                    </Link>
                    <Link
                        underline="hover"
                        color="neutral"
                        fontSize={12}
                        fontWeight={500}
                        component={RouterLink}
                        to="/"
                    >
                        Tasks
                    </Link>
                    <Typography color="primary" fontWeight={500} fontSize={12}>
                        {taskName}
                    </Typography>
                </Breadcrumbs>
            </div>
            <div className="w-full max-w-full flex flex-row flex-wrap justify-between mx-4">
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                    }}
                >
                    <Typography
                        level="h2"
                        component="h1"
                    >
                        {taskName}
                    </Typography>

                    <Typography
                        level="h3"
                        component="h3"
                        sx={{ color: "gray", fontSize: "1.5rem" }} // Secondary text: smaller, gray
                    >
                        Recording Id: {taskId}
                    </Typography>
                </Box>
                <ReactPlayer
                    url={`file:///${fullVideoSrc}`}
                    controls={true} // set this true to enable progress bar
                    playing={playing}
                    onEnded={handleFullVideoEnd}
                    width="0px"
                    height="0px"
                    muted={true}
                    onDuration={handleDuration}
                />

                <div className="flex items-center justify-center gap-1 mr-10">
                    <Box>
                        <Button
                            ref={cutButtonRef}
                            color="primary"
                            startDecorator={<CreateIcon />}
                            size="sm"
                            onClick={handleCallCut}
                            sx={{ width: "100px" }}
                        >
                            Annotate
                        </Button>
                        <Popper
                            id="popover"
                            open={popOpen}
                            anchorEl={cutButtonRef.current}
                            placement="left"
                            style={{
                                zIndex: 1300,
                                boxShadow: "0px 2px 8px rgba(0,0,0,0.15)",
                                borderRadius: "4px",
                                padding: "16px",
                            }}
                            ref={cutPopperRef}
                        >
                            <Card>
                                <Typography id="interval-slider" gutterBottom>
                                    Select the event interval corresponding to
                                    the task
                                </Typography>
                                <Box>
                                    {/* Slider */}
                                    <Slider
                                        getAriaLabel={() => "Temperature range"}
                                        value={[valMin, valMax]}
                                        onChange={handleSliderChange}
                                        valueLabelDisplay="auto"
                                        min={1}
                                        max={eventsListLengthRef.current}
                                    />

                                    <Stack
                                        direction="row"
                                        alignItems="center"
                                        spacing={2}
                                    >
                                        <Typography level="body-md">
                                            First
                                        </Typography>
                                        <div className="mt-2">
                                            <div className="flex rounded-md shadow-sm ring-1 ring-inset  focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
                                                <input
                                                    id="valmin"
                                                    name="valmin"
                                                    type="text"
                                                    value={inputValMin}
                                                    onChange={
                                                        handleMinInputChange
                                                    }
                                                    onBlur={handleMinBlur}
                                                    className="block flex-1 border-0 bg-transparent py-1.5 pl-1 placeholder: focus:ring-0 sm:text-sm sm:leading-6"
                                                />
                                            </div>
                                        </div>

                                        <Typography level="body-md">
                                            Last
                                        </Typography>
                                        <div className="mt-2">
                                            <div className="flex rounded-md shadow-sm ring-1 ring-inset  focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
                                                <input
                                                    id="valmax"
                                                    name="valmax"
                                                    type="text"
                                                    value={inputValMax}
                                                    onChange={
                                                        handleMaxInputChange
                                                    }
                                                    onBlur={handleMaxBlur}
                                                    className="block flex-1 border-0 bg-transparent py-1.5 pl-1 placeholder: focus:ring-0 sm:text-sm sm:leading-6"
                                                />
                                            </div>
                                        </div>
                                    </Stack>
                                </Box>
                                <Box>
                                    <div className="sm:col-span-4">
                                        <label
                                            htmlFor="task_name"
                                            className="block text-sm font-medium leading-6 "
                                        >
                                            Task name
                                        </label>
                                        <div className="mt-2">
                                            <div className="flex rounded-md shadow-sm ring-1 ring-inset  focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
                                                <input
                                                    id="taskname"
                                                    name="taskname"
                                                    type="text"
                                                    autoComplete="taskname"
                                                    placeholder="Create a simple and actionable name for this task."
                                                    value={cutTaskName}
                                                    onChange={(e) =>
                                                        setCutTaskName(
                                                            e.target.value
                                                        )
                                                    }
                                                    className="block flex-1 border-0 bg-transparent py-1.5 pl-1 placeholder: focus:ring-0 sm:text-sm sm:leading-6"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    {/* <br />
                                    <div className="col-span-full">
                                        <label
                                            htmlFor="description"
                                            className="block text-sm font-medium leading-6 "
                                        >
                                            Description
                                        </label>
                                        <div className="mt-2">
                                            <div className="flex rounded-md shadow-sm ring-1 ring-inset  focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
                                                <textarea
                                                    id="taskname"
                                                    name="taskname"
                                                    autoComplete="taskname"
                                                    placeholder="Write a few sentences to describe the task."
                                                    rows={5}
                                                    value={cutDescription}
                                                    onChange={(e) =>
                                                        setCutDescription(
                                                            e.target.value
                                                        )
                                                    }
                                                    className="block flex-1 border-0 bg-transparent py-1.5 pl-1 placeholder: focus:ring-0 sm:text-sm sm:leading-6"
                                                />
                                            </div>
                                        </div>
                                    </div> */}
                                    <br />
                                    <Grid columns={2}>
                                        <Button
                                            onClick={handleSaveCut}
                                            variant="solid"
                                            sx={{
                                                flex: 1,
                                                mr: 1,
                                                py: 0.5,
                                                fontSize: "0.875rem",
                                                height: "32px",
                                            }}
                                        >
                                            Save
                                        </Button>
                                        <Button
                                            onClick={handlePolish}
                                            variant="solid"
                                            sx={{
                                                flex: 1,
                                                mr: 1,
                                                py: 0.5,
                                                fontSize: "0.875rem",
                                                height: "32px",
                                            }}
                                        >
                                            Polish by AI
                                        </Button>
                                    </Grid>
                                </Box>{" "}
                            </Card>
                        </Popper>
                    </Box>
                    <Button
                        color="danger"
                        startDecorator={<DeleteIcon />}
                        size="sm"
                        onClick={handleDeleteRecording}
                        sx={{ width: "100px" }}
                    >
                        Delete
                    </Button>
                    <Button
                        color="success"
                        startDecorator={
                            <SvgIcon>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
                                    />
                                </svg>
                            </SvgIcon>
                        }
                        size="sm"
                        onClick={handleUploadRecording}
                        sx={{ width: "100px" }}
                    >
                        Upload
                    </Button>
                </div>
            </div>
            {/* <div className="w-full max-w-full flex flex-col md:flex-row gap-1 flex-wrap justify-between mx-2 md:mx-4">
                <EditableText
                    text={description}
                    onSave={setDescription}
                    row_character_number={50}
                    before="text-md text-slate-600 dark:text-slate-400 my-1 p-0 text-warp w-full max-w-full"
                    after="block w-full rounded-md border-0 py-1.5 text-warp text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 focus:dark:ring-indigo-500 dark:ring-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    defaultText="[Write a few sentences to describe the recording.]"
                />
            </div> */}
            <div className="w-full max-w-full overflow-x-hidden flex flex-col">
                <div className="flex flex-row grid grid-cols-4 gap-1">
                    <div className="flex items-center col-span-3">
                        <Box
                            sx={{
                                flexGrow: 1,
                                overflowX: "hidden",
                            }}
                        >
                            <Tabs
                                aria-label="Pipeline"
                                value={index}
                                onChange={(event, value) =>
                                    setIndex(value as number)
                                }
                                sx={{
                                    bgcolor: "transparent",
                                }}
                            >
                                <TabList
                                    sx={{
                                        justifyContent: "center",
                                        [`&& .${tabClasses.root}`]: {
                                            flex: "initial",
                                            bgcolor: "transparent",
                                            "&:hover": {
                                                bgcolor: "transparent",
                                            },
                                            [`&.${tabClasses.selected}`]: {
                                                color: "primary.plainColor",
                                                "&::after": {
                                                    height: 2,
                                                    borderTopLeftRadius: 3,
                                                    borderTopRightRadius: 3,
                                                    bgcolor: "primary.500",
                                                },
                                            },
                                        },
                                    }}
                                >
                                    <Tab indicatorInset>Event Clips</Tab>
                                    <Tab indicatorInset>Data</Tab>
                                    <Tab indicatorInset>Full Video</Tab>
                                </TabList>
                                <Box
                                    sx={(theme) => ({
                                        "--bg": theme.vars.palette.background
                                            .surface,
                                        background: "var(--bg)",
                                        boxShadow: "0 0 0 100vmax var(--bg)",
                                        clipPath: "inset(0 -100vmax)",
                                    })}
                                >
                                    <TabPanel
                                        value={0}
                                        sx={{ mx: -2, bgcolor: "transparent" }}
                                    >
                                        {videoClipSrc ? (
                                            <AspectRatio
                                                objectFit="contain"
                                                sx={{ height: "100%" }}
                                                variant="plain"
                                                maxHeight="70vh"
                                            >
                                                <ReactPlayer
                                                    url={`file:///${videoClipSrc}`}
                                                    controls={false}
                                                    style={{
                                                        position: "absolute",
                                                        top: 0,
                                                        left: 0,
                                                    }}
                                                    playing={playing}
                                                    onEnded={handleVideoClipEnd}
                                                    width="100%"
                                                    height="100%"
                                                />
                                            </AspectRatio>
                                        ) : (
                                            <p>No Video Support</p>
                                        )}{" "}
                                    </TabPanel>
                                    <TabPanel value={1}>
                                        {eventsList[activeStep] ? (
                                            eventsList[activeStep].axtree ? (
                                                <div
                                                    className="h-full overflow-y-auto"
                                                    style={{
                                                        maxHeight: "70vh",
                                                    }}
                                                >
                                                    <ReactJson
                                                        src={
                                                            eventsList[
                                                                activeStep
                                                            ].axtree
                                                        }
                                                    />
                                                </div>
                                            ) : (
                                                <div
                                                    className="h-full overflow-y-auto"
                                                    style={{
                                                        display: "flex",
                                                        justifyContent:
                                                            "center",
                                                        alignItems: "center",
                                                        textAlign: "center",
                                                    }}
                                                >
                                                    <p>No a11y tree</p>
                                                </div>
                                            )
                                        ) : (
                                            <div
                                                className="h-full overflow-y-auto"
                                                style={{
                                                    display: "flex",
                                                    justifyContent: "center",
                                                    alignItems: "center",
                                                    textAlign: "center",
                                                }}
                                            >
                                                <p>No a11y tree</p>
                                            </div>
                                        )}
                                    </TabPanel>
                                    <TabPanel value={2}>
                                        {fullVideoSrc ? (
                                            <AspectRatio
                                                objectFit="contain"
                                                sx={{ height: "100%" }}
                                                variant="plain"
                                            >
                                                <ReactPlayer
                                                    url={`file:///${fullVideoSrc}`}
                                                    controls={true} // set this true to enable progress bar
                                                    playing={playing}
                                                    onEnded={handleFullVideoEnd}
                                                    width="100%"
                                                    height="100%"
                                                    style={{
                                                        position: "absolute",
                                                        top: 0,
                                                        left: 0,
                                                    }}
                                                />
                                            </AspectRatio>
                                        ) : (
                                            <p>No Video Support</p>
                                        )}{" "}
                                    </TabPanel>
                                </Box>
                            </Tabs>
                        </Box>
                    </div>
                    <div className="flex flex-col col-span-1">
                        <Box
                            sx={{
                                m: 2,
                                pt: 2,
                            }}
                            className="flex justify-between"
                        >
                            <Typography level="h4">
                                Step {activeStep + 1} / {eventsList.length}{" "}
                                {activeStep + 1 === eventsList.length
                                    ? " ✅"
                                    : ""}
                            </Typography>
                            <div className="flex items-center">
                                <button
                                    onClick={handleUndo}
                                    className={`flex items-center text-xs ${
                                        operationHistory.length === 0
                                            ? "opacity-70 cursor-not-allowed"
                                            : ""
                                    }`}
                                    disabled={operationHistory.length === 0}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={1.5}
                                        stroke="currentColor"
                                        className="size-6"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
                                        />
                                    </svg>
                                </button>
                                <button
                                    onClick={handleRedo}
                                    className={`flex items-center ${
                                        redoStack.length === 0
                                            ? "opacity-70 cursor-not-allowed"
                                            : ""
                                    }`}
                                    disabled={redoStack.length === 0}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={1.5}
                                        stroke="currentColor"
                                        className="size-6"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                                        />
                                    </svg>
                                </button>
                            </div>
                        </Box>

                        <Box
                            sx={{
                                height: "72vh",
                                position: "relative",
                                overflowY: "hidden",
                            }}
                        >
                            <Box
                                sx={{
                                    height: "100%",
                                    overflowY: "hidden",
                                    position: "relative",
                                }}
                                onWheel={handleWheel}
                                ref={stepperRef}
                            >
                                <Stepper
                                    orientation="vertical"
                                    sx={{
                                        m: 2,
                                        pt: 1,
                                        pb: 2,
                                        "--Stepper-verticalGap": "1.5rem",
                                        "--StepIndicator-size": "1.5rem",
                                        "--Step-gap": "0.75rem",
                                        "--Step-connectorInset": "-1rem",
                                        "--Step-connectorRadius": "1rem",
                                        "--Step-connectorThickness": "1.5px",
                                        "--joy-palette-success-solidBg":
                                            "var(--joy-palette-success-400)",
                                        [`& .${stepClasses.completed}`]: {
                                            "&::after": {
                                                bgcolor: "success.solidBg",
                                            },
                                        },
                                        [`& .${stepClasses.active}`]: {
                                            [`& .${stepIndicatorClasses.root}`]:
                                                {
                                                    border: "4px solid",
                                                    borderColor: "#fff",
                                                    boxShadow: (theme) =>
                                                        `0 0 0 1px ${theme.vars.palette.primary[500]}`,
                                                },
                                        },
                                        [`& .${stepClasses.disabled} *`]: {
                                            color: "neutral.softDisabledColor",
                                        },
                                        [`& .${typographyClasses["title-sm"]}`]:
                                            {
                                                textTransform: "uppercase",
                                                letterSpacing: "1px",
                                                fontSize: "10px",
                                            },
                                    }}
                                >
                                    {eventsList.map((event, index: any) => (
                                        <Step
                                            key={index}
                                            completed={index < activeStep}
                                            active={index === activeStep}
                                            disabled={index > activeStep}
                                            indicator={
                                                <StepIndicator
                                                    variant={
                                                        activeStep <= index
                                                            ? "soft"
                                                            : "solid"
                                                    }
                                                    color={
                                                        activeStep < index
                                                            ? "neutral"
                                                            : activeStep ===
                                                              index
                                                            ? "primary"
                                                            : "success"
                                                    }
                                                >
                                                    {activeStep <= index ? (
                                                        index + 1
                                                    ) : (
                                                        <Check />
                                                    )}
                                                </StepIndicator>
                                            }
                                            sx={{
                                                "&::after": {
                                                    ...(activeStep > index &&
                                                        index !== 2 && {
                                                            bgcolor:
                                                                "primary.solidBg",
                                                        }),
                                                },
                                            }}
                                        >
                                            <Badge
                                                badgeContent={
                                                    index === activeStep ? (
                                                        <ClearIcon
                                                            onClick={() =>
                                                                handleDeleteEvent(
                                                                    index
                                                                )
                                                            }
                                                            style={{
                                                                color: "primary.light",
                                                                cursor: "pointer",
                                                            }}
                                                        />
                                                    ) : null
                                                }
                                                variant="plain"
                                                size="sm"
                                            >
                                                <Box
                                                    onClick={() =>
                                                        setActiveStep(index)
                                                    }
                                                    sx={{
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        gap: 0,
                                                        alignItems:
                                                            "flex-start",
                                                        textAlign: "left",
                                                        p: 1,
                                                        width: "100%",
                                                        overflow: "hidden",
                                                    }}
                                                    className={
                                                        activeStep === index
                                                            ? "bg-slate-50 rounded shadow-sm border border-slate-100 dark:bg-slate-800 dark:border-slate-900"
                                                            : activeStep > index
                                                            ? "bg-green-50 rounded shadow-sm dark:bg-green-800"
                                                            : "bg-transparent rounded shadow-sm"
                                                    }
                                                >
                                                    {index === activeStep ? (
                                                        <EditableText
                                                            text={Title2String(
                                                                event.action,
                                                                event.target,
                                                                event.past_frame_target,
                                                                event.gpt_target
                                                            )}
                                                            onSave={(e) =>
                                                                handleChange(
                                                                    e,
                                                                    index,
                                                                    "action"
                                                                )
                                                            }
                                                            row_character_number={
                                                                18
                                                            }
                                                            before="text-md w-full font-bold text-black my-1 p-0 text-warp dark:text-white"
                                                            after="block w-full max-w-4xl rounded-md border-0 py-1.5 text-warp text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 focus:dark:ring-indigo-500 dark:ring-gray-700 dark:bg-gray-800 dark:text-gray-100"
                                                        />
                                                    ) : (
                                                        <p className="text-md w-full font-bold text-black my-1 p-0 text-warp dark:text-white">
                                                            {Title2String(
                                                                event.action,
                                                                event.target,
                                                                event.past_frame_target,
                                                                event.gpt_target
                                                            )}
                                                        </p>
                                                    )}
                                                    {index === activeStep ? (
                                                        <EditableText
                                                            text={
                                                                event.description as string
                                                            }
                                                            row_character_number={
                                                                18
                                                            }
                                                            onSave={(e) =>
                                                                handleChange(
                                                                    e,
                                                                    index,
                                                                    "description"
                                                                )
                                                            }
                                                            before="text-xs text-slate-600 w-full dark:text-slate-400 my-1 p-0 text-warp"
                                                            after="block w-full max-w-4xl rounded-md border-0 py-1.5 text-warp text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 focus:dark:ring-indigo-500 dark:ring-gray-700 dark:bg-gray-800 dark:text-gray-100"
                                                        />
                                                    ) : (
                                                        <DisplayTextarea
                                                            value={
                                                                event.description as string
                                                            }
                                                            index={index}
                                                        />
                                                    )}
                                                </Box>
                                            </Badge>
                                        </Step>
                                    ))}
                                </Stepper>
                            </Box>
                        </Box>
                    </div>
                </div>
            </div>
            <Snackbar
                open={isUploading}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
                color="primary"
                sx={{
                    padding: 0.5,
                    margin: 0.5,
                }}
            >
                <Box
                    sx={{
                        width: "100%",
                        maxWidth: 480,
                        padding: 0.5,
                        margin: 0.5,
                    }}
                >
                    <Typography level="body-xs">Upload Progress:</Typography>
                    <LinearProgress
                        determinate
                        variant="outlined"
                        value={uploadProgress}
                        color="primary"
                        size="sm"
                        sx={{
                            height: "12px",
                            borderRadius: "4px",
                            "--LinearProgress-thickness": "8px",
                        }}
                    >
                        <Typography
                            level="body-xs"
                            fontWeight="xl"
                            textColor="common.white"
                            sx={{ mixBlendMode: "difference" }}
                        >
                            {`${Math.round(uploadProgress)}%`}
                        </Typography>
                    </LinearProgress>
                </Box>
            </Snackbar>
            <Snackbar
                open={openSnackbar}
                autoHideDuration={3000}
                onClose={() => setOpenSnackbar(false)}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
                color={severity === "success" ? "success" : "warning"}
            >
                {message}
            </Snackbar>
            {blocker.state === "blocked" ? (
                <Dialog
                    open={blocker.state === "blocked"}
                    onClose={onCancel}
                    className="relative z-10"
                >
                    <DialogBackdrop
                        transition
                        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in"
                    />

                    <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                            <DialogPanel
                                transition
                                className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all data-[closed]:translate-y-4 data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in sm:my-8 sm:w-full sm:max-w-lg data-[closed]:sm:translate-y-0 data-[closed]:sm:scale-95"
                            >
                                <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                                    <div className="sm:flex sm:items-start">
                                        <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                                            <ExclamationTriangleIcon
                                                aria-hidden="true"
                                                className="h-6 w-6 text-red-600"
                                            />
                                        </div>
                                        <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                                            <DialogTitle
                                                as="h3"
                                                className="text-base font-semibold leading-6 text-gray-900"
                                            >
                                                Unsaved Changes
                                            </DialogTitle>
                                            <div className="mt-2">
                                                <p className="text-sm text-gray-500">
                                                    You have unsaved changes
                                                    made to events, do you want
                                                    to save them?
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                                    <button
                                        type="button"
                                        onClick={() => onSave()}
                                        className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto"
                                    >
                                        Save
                                    </button>
                                    <button
                                        type="button"
                                        data-autofocus
                                        onClick={() => onCancel()}
                                        className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                                    >
                                        Don't save
                                    </button>
                                </div>
                            </DialogPanel>
                        </div>
                    </div>
                </Dialog>
            ) : null}
        </div>
    );
};
export default Page;
