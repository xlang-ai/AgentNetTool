import * as React from "react";
import { useCallback, useEffect, useRef, useState, ReactNode } from "react";
import {
    Link as RouterLink,
    useBlocker,
    useLoaderData,
} from "react-router-dom";
import {
    Dialog,
    DialogBackdrop,
    DialogPanel,
    DialogTitle,
} from "@headlessui/react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
//import worker_script from "../utils/uploadWorker";
import {
    Box,
    Button,
    Breadcrumbs,
    Card,
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
    LinearProgress,
    Typography,
    StepIndicator,
    Step,
    Tab,
    Tooltip,
} from "@mui/joy";
import { tabClasses } from "@mui/joy/Tab";
import { stepClasses } from "@mui/joy/Step";
import { stepIndicatorClasses } from "@mui/joy/StepIndicator";
import { typographyClasses } from "@mui/joy/Typography";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import Check from "@mui/icons-material/Check";
import { Popper, ClickAwayListener } from "@mui/material";
import { default as _ReactPlayer } from "react-player/lazy";
import { ReactPlayerProps } from "react-player/types/lib";
import ClearIcon from "@mui/icons-material/Clear";
import { useMain } from "../../context/MainContext";
import "react-edit-text/dist/index.css";
import EditableText from "../utils/EditableTextArea";
import { eventProp, Title2String } from "../Local/page";

const ReactPlayer = _ReactPlayer as unknown as React.FC<ReactPlayerProps>;

interface KeyboardKeyProps {
    children: ReactNode;
}

interface DisplayTextareaProps {
    value: string;
    index: number;
}

interface VideoDict {
    [key: number]: string;
}

const ReviewPage = () => {
    const [recordingName, setRecordingName] = useState("");
    const [taskName, setTaskName] = useState("");
    const [description, setDescription] = useState("");
    const [verifyStatus, setVerifyStatus] = useState("");
    const [eventsList, setEventsList] = useState<eventProp[]>([]);
    const eventsListLengthRef = useRef(eventsList.length);
    const [taskId, setTaskId] = useState("");
    const [activeStep, setActiveStep] = React.useState(0); //被展示的index
    const [index, setIndex] = React.useState(0);
    const [scrollDelta, setScrollDelta] = useState<number>(0);
    const [videoClipSrcDict, setVideoClipSrcDict] = useState<VideoDict>({});
    const [videoClipSrc, setVideoClipSrc] = useState("");
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [message, setMessage] = useState("");
    const [severity, setSeverity] = useState("success"); // 'success', 'error', 'warning', 'neutral'
    const [isEditing, setIsEditing] = useState(eventsList.map(() => false));
    const [playing, setPlaying] = useState(true);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [valMax, setValMax] = useState<number>(2);
    const {
        SocketService,
        user_id,
        fetchNewTasksToVerify,
        allVerifyTasks,
        setAllVerifyTasks,
    } = useMain();
    const scrollThreshold = 100;
    const stepperRef = useRef<HTMLDivElement>(null);
    const recordingData: any = useLoaderData();
    const [operationHistory, setOperationHistory] = useState<any[]>([]); // Stack for undo operations
    const [redoStack, setRedoStack] = useState<any[]>([]); // Stack for redo operations (optional)
    const [dirty, setIsDirty] = useState(false);
    const [feedback, setFeedback] = useState("");
    const [rejectPopOpen, setRejectPopOpen] = useState(false);
    const [editPopOpen, setEditPopOpen] = useState(false);
    const [acceptPopOpen, setAcceptPopOpen] = useState(false);
    const [acceptLevel, setAcceptLevel] = useState("good");
    const modifyButtonRef = useRef<HTMLButtonElement>(null);
    const modifyPopperRef = useRef<HTMLDivElement>(null);
    const rejectButtonRef = useRef<HTMLButtonElement>(null);
    const rejectPopperRef = useRef<HTMLDivElement>(null);
    const acceptButtonRef = useRef<HTMLButtonElement>(null);
    const acceptPopperRef = useRef<HTMLDivElement>(null);
    // Block navigating elsewhere when data has been entered into the input
    let blocker = useBlocker(({ currentLocation, nextLocation }) => dirty);
    useEffect(() => {
        if (videoClipSrcDict[activeStep]) {
            setVideoClipSrc(videoClipSrcDict[activeStep]);
        }
    }, [videoClipSrcDict, activeStep]);

    useEffect(() => {
        console.log(recordingData);
        setRecordingName(recordingData.recording_name as string);
        setTaskName(recordingData.task_data.task_name as string);
        //setDescription(recordingData.task_data.task_description as string);
        setVerifyStatus(recordingData.task_data.status as string);
        console.log("status: ", recordingData.task_data.status);
        setEventsList(recordingData.task_data.events as eventProp[]);
        setTaskId(recordingData.task_data.recording_id as string);
        setActiveStep(0);
    }, [recordingData]);

    useEffect(() => {
        setIndex(0); // display
        const fetchVideoClip = async (index: number) => {
            try {
                const response = await fetch(
                    `http://localhost:5328/api/video/${recordingName}/${index}/1`,
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
                setVideoClipSrcDict((prevDict) => ({
                    ...prevDict,
                    [index]: path,
                }));
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
        }
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
    }, [activeStep, eventsList.length]);

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

    const handleVerify = (verifyType: string) => {
        console.log(verifyType);
        if (verifyType === "rejected") {
            console.log({ feedback: feedback });
            SocketService.Post("verify", {
                recording_id: recordingName,
                decision: "rejected",
                user_id: user_id,
                feedback: { feedback: feedback },
            }).then((data) => {
                console.log(data);
                if (data.status === "succeed") {
                    showSuccess(data.message);
                    setVerifyStatus("rejected");
                    setAllVerifyTasks(
                        allVerifyTasks.filter(
                            (task) => task.recording_id !== recordingName
                        )
                    );
                    fetchNewTasksToVerify();
                } else {
                    showError(data.message);
                }
            });
        } else if (verifyType === "editing") {
            console.log({ feedback: feedback });
            SocketService.Post("verify", {
                recording_id: recordingName,
                decision: "editing",
                user_id: user_id,
                feedback: { feedback: feedback },
            }).then((data) => {
                console.log(data);
                if (data.status === "succeed") {
                    showSuccess(data.message);
                    setVerifyStatus("editing");
                    setAllVerifyTasks(
                        allVerifyTasks.filter(
                            (task) => task.recording_id !== recordingName
                        )
                    );
                    fetchNewTasksToVerify();
                } else {
                    showError(data.message);
                }
            });
        } else if (verifyType === "accepted") {
            SocketService.Post("verify", {
                recording_id: recordingName,
                decision: "accepted",
                user_id: user_id,
                feedback: { quality: acceptLevel },
            }).then((data) => {
                console.log(data);
                // Mark this function as async
                if (data.status === "succeed") {
                    showSuccess(data.message);
                    setVerifyStatus("accepted");
                    setAllVerifyTasks(
                        allVerifyTasks.filter(
                            (task) => task.recording_id !== recordingName
                        )
                    );
                    fetchNewTasksToVerify();
                } else {
                    showError(data.message);
                }
            });
            setFeedback("");
            setAcceptLevel("good");
        }
    };

    return (
        <Box
            component="main"
            className="MainContent"
            sx={{
                px: 0,
                mt: 1,
                flex: 1,
                display: "flex",
                flexDirection: "column",
                minWidth: 0,
                gap: 0.5,
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    px: { xs: 2, md: 4 },
                }}
            >
                <Breadcrumbs
                    size="sm"
                    aria-label="breadcrumbs"
                    separator={<ChevronRightRoundedIcon />}
                    sx={{ pl: 0 }}
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
            </Box>
            <Box
                sx={{
                    display: "flex",
                    px: { xs: 2, md: 4 },

                    gap: 1,
                    flexDirection: { xs: "column", sm: "row" },
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                }}
            >
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
                        <Typography level="body-xs">
                            Upload Progress:
                        </Typography>
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
                                                        made to events, do you
                                                        want to save them?
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

                <Stack
                    sx={{
                        display: "flex",
                        gap: 1,
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "row",
                    }}
                >
                    {(verifyStatus === "verifying"  || verifyStatus === "rejected") ? (
                        <>
                            <Button
                                //color="danger"
                                startDecorator={<CloseIcon />}
                                size="sm"
                                ref={rejectButtonRef}
                                onClick={() => setRejectPopOpen(!rejectPopOpen)}
                                sx={{
                                    width: "100px",
                                    backgroundColor: "red",
                                    color: "white",
                                    "&:hover": {
                                        backgroundColor: "darkred",
                                    },
                                }}
                            >
                                Reject
                            </Button>
                            <Box>
                                <Popper
                                    id="popover"
                                    open={rejectPopOpen}
                                    anchorEl={rejectButtonRef.current}
                                    placement="bottom"
                                    style={{
                                        zIndex: 1300,
                                        boxShadow:
                                            "0px 2px 8px rgba(0,0,0,0.15)",
                                        borderRadius: "4px",
                                        padding: "16px",
                                    }}
                                    ref={rejectPopperRef}
                                >
                                    <Card>
                                        <Typography
                                            id="interval-slider"
                                            gutterBottom
                                        >
                                            Feedback:
                                        </Typography>
                                        <Box>
                                            <div className="col-span-full">
                                                <div className="mt-2">
                                                    <div className="flex rounded-md shadow-sm ring-1 ring-inset  focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
                                                        <textarea
                                                            id="taskname"
                                                            name="taskname"
                                                            autoComplete="taskname"
                                                            placeholder="Write a few sentences to describe the task."
                                                            rows={2}
                                                            value={feedback}
                                                            onChange={(e) =>
                                                                setFeedback(
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            className="block flex-1 border-0 bg-transparent py-1.5 pl-1 placeholder: focus:ring-0 sm:text-sm sm:leading-6"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <br />
                                            <Grid columns={2}>
                                                <Button
                                                    onClick={() => {
                                                        handleVerify(
                                                            "rejected"
                                                        );
                                                        setRejectPopOpen(false);
                                                    }}
                                                    variant="solid"
                                                    sx={{
                                                        flex: 1,
                                                        mr: 1,
                                                        py: 0.5,
                                                        fontSize: "0.875rem",
                                                        height: "32px",
                                                    }}
                                                >
                                                    Verify
                                                </Button>
                                            </Grid>
                                        </Box>{" "}
                                    </Card>
                                </Popper>
                            </Box>
                            <Button
                                //color="danger"
                                startDecorator={<EditIcon />}
                                size="sm"
                                ref={modifyButtonRef}
                                onClick={() => setEditPopOpen(!editPopOpen)}
                                sx={{
                                    width: "100px",
                                    backgroundColor: "orange",
                                    color: "white",
                                    "&:hover": {
                                        backgroundColor: "darkorange",
                                    },
                                }}
                            >
                                Modify
                            </Button>
                            <Box>
                                <Popper
                                    id="popover"
                                    open={editPopOpen}
                                    anchorEl={modifyButtonRef.current}
                                    placement="bottom"
                                    style={{
                                        zIndex: 1300,
                                        boxShadow:
                                            "0px 2px 8px rgba(0,0,0,0.15)",
                                        borderRadius: "4px",
                                        padding: "16px",
                                    }}
                                    ref={modifyPopperRef}
                                >
                                    <Card>
                                        <Typography
                                            id="interval-slider"
                                            gutterBottom
                                        >
                                            Feedback:
                                        </Typography>
                                        <Box>
                                            <div className="col-span-full">
                                                <div className="mt-2">
                                                    <div className="flex rounded-md shadow-sm ring-1 ring-inset  focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
                                                        <textarea
                                                            id="taskname"
                                                            name="taskname"
                                                            autoComplete="taskname"
                                                            placeholder="Write a few sentences to describe the task."
                                                            rows={2}
                                                            value={feedback}
                                                            onChange={(e) =>
                                                                setFeedback(
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            className="block flex-1 border-0 bg-transparent py-1.5 pl-1 placeholder: focus:ring-0 sm:text-sm sm:leading-6"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <br />
                                            <Grid columns={2}>
                                                <Button
                                                    onClick={() => {
                                                        handleVerify("editing");
                                                        setEditPopOpen(false);
                                                    }}
                                                    variant="solid"
                                                    sx={{
                                                        flex: 1,
                                                        mr: 1,
                                                        py: 0.5,
                                                        fontSize: "0.875rem",
                                                        height: "32px",
                                                    }}
                                                >
                                                    Verify
                                                </Button>
                                            </Grid>
                                        </Box>{" "}
                                    </Card>
                                </Popper>
                            </Box>
                            <Button
                                //color="success"
                                startDecorator={<CheckIcon />}
                                ref={acceptButtonRef}
                                size="sm"
                                onClick={() => setAcceptPopOpen(!acceptPopOpen)}
                                sx={{
                                    width: "100px",
                                    backgroundColor: "green",
                                    color: "white",
                                    "&:hover": {
                                        backgroundColor: "darkgreen",
                                    },
                                }}
                            >
                                Accept
                            </Button>
                            <Box>
                                <Popper
                                    id="popover"
                                    open={acceptPopOpen}
                                    anchorEl={acceptButtonRef.current}
                                    placement="bottom"
                                    style={{
                                        zIndex: 1300,
                                        boxShadow:
                                            "0px 2px 8px rgba(0,0,0,0.15)",
                                        borderRadius: "4px",
                                        padding: "16px",
                                    }}
                                    ref={acceptPopperRef}
                                >
                                    <Card>
                                        <Typography
                                            id="interval-slider"
                                            gutterBottom
                                        >
                                            Quality:
                                        </Typography>
                                        <Box>
                                            <div className="col-span-full">
                                                <div className="mt-2">
                                                    <Grid container spacing={2}>
                                                        <Grid>
                                                            <Tooltip title="Task too short / rare / easy">
                                                                <Button
                                                                    variant="outlined"
                                                                    onClick={() =>
                                                                        setAcceptLevel(
                                                                            "ok"
                                                                        )
                                                                    }
                                                                    sx={{
                                                                        backgroundColor:
                                                                            acceptLevel ===
                                                                            "ok"
                                                                                ? "lightblue"
                                                                                : "transparent",
                                                                        borderColor:
                                                                            acceptLevel ===
                                                                            "ok"
                                                                                ? "blue"
                                                                                : "default",
                                                                        color:
                                                                            acceptLevel ===
                                                                            "ok"
                                                                                ? "blue"
                                                                                : "default",
                                                                    }}
                                                                >
                                                                    OK
                                                                </Button>
                                                            </Tooltip>
                                                        </Grid>
                                                        <Grid>
                                                            <Tooltip title="Task with a clear goal and around 10 steps">
                                                                <Button
                                                                    variant="outlined"
                                                                    onClick={() =>
                                                                        setAcceptLevel(
                                                                            "good"
                                                                        )
                                                                    }
                                                                    sx={{
                                                                        backgroundColor:
                                                                            acceptLevel ===
                                                                            "good"
                                                                                ? "lightblue"
                                                                                : "transparent",
                                                                        borderColor:
                                                                            acceptLevel ===
                                                                            "good"
                                                                                ? "blue"
                                                                                : "default",
                                                                        color:
                                                                            acceptLevel ===
                                                                            "good"
                                                                                ? "blue"
                                                                                : "default",
                                                                    }}
                                                                >
                                                                    Good
                                                                </Button>
                                                            </Tooltip>
                                                        </Grid>
                                                        <Grid>
                                                            <Tooltip title="Task with a clear and important goal and around 20 steps">
                                                                <Button
                                                                    variant="outlined"
                                                                    onClick={() =>
                                                                        setAcceptLevel(
                                                                            "excellent"
                                                                        )
                                                                    }
                                                                    sx={{
                                                                        backgroundColor:
                                                                            acceptLevel ===
                                                                            "excellent"
                                                                                ? "lightblue"
                                                                                : "transparent",
                                                                        borderColor:
                                                                            acceptLevel ===
                                                                            "excellent"
                                                                                ? "blue"
                                                                                : "default",
                                                                        color:
                                                                            acceptLevel ===
                                                                            "excellent"
                                                                                ? "blue"
                                                                                : "default",
                                                                    }}
                                                                >
                                                                    Excellent
                                                                </Button>
                                                            </Tooltip>
                                                        </Grid>
                                                    </Grid>
                                                </div>
                                            </div>
                                            <br />
                                            <Grid columns={2}>
                                                <Button
                                                    onClick={() => {
                                                        handleVerify(
                                                            "accepted"
                                                        );
                                                        setAcceptPopOpen(false);
                                                    }}
                                                    variant="solid"
                                                    sx={{
                                                        flex: 1,
                                                        mr: 1,
                                                        py: 0.5,
                                                        fontSize: "0.875rem",
                                                        height: "32px",
                                                    }}
                                                >
                                                    Verify
                                                </Button>
                                            </Grid>
                                        </Box>{" "}
                                    </Card>
                                </Popper>
                            </Box>
                        </>
                    ) : (
                        <>
                            <Button
                                color="neutral"
                                startDecorator={<CloseIcon />}
                                size="sm"
                                sx={{ width: "100px" }}
                            >
                                Reject
                            </Button>
                            <Button
                                color="neutral"
                                startDecorator={<EditIcon />}
                                size="sm"
                                sx={{ width: "100px" }}
                            >
                                Modify
                            </Button>
                            <Button
                                color="neutral"
                                startDecorator={<CheckIcon />}
                                size="sm"
                                sx={{ width: "100px" }}
                            >
                                Accept
                            </Button>
                        </>
                    )}
                </Stack>
            </Box>
            {/* <Box
                sx={{
                    display: "flex",
                    px: { xs: 2, md: 4 },

                    gap: 1,
                    flexDirection: { xs: "column", sm: "row" },
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                }}
            >
                <EditableText
                    text={description}
                    onSave={setDescription}
                    row_character_number={50}
                    before="text-md text-slate-600 dark:text-slate-400 my-1 p-0 text-warp w-full"
                    after="block w-full  rounded-md border-0 py-1.5 text-warp text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 focus:dark:ring-indigo-500 dark:ring-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    defaultText="[Write a few sentences to describe the recording.]"
                />
            </Box> */}
            <Box>
                <Grid container spacing={1}>
                    <Grid xs={9.5}>
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
                                    {/* <Tab indicatorInset>Full Video</Tab> */}
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
                                        sx={{
                                            mx: -2,
                                            bgcolor: "transparent",
                                        }}
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
                                    <TabPanel value={1}>A11y Tree</TabPanel>
                                    {/* <TabPanel value={2}>
                                        {" "}
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
                                    </TabPanel> */}
                                </Box>
                            </Tabs>
                        </Box>
                    </Grid>
                    <Grid xs={2.5}>
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
                                        "--Step-connectorInset": "-100%",
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
                                                    border: "0px solid",
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
                    </Grid>
                </Grid>
            </Box>
            <Snackbar
                open={openSnackbar}
                autoHideDuration={3000}
                onClose={() => setOpenSnackbar(false)}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
                color={severity === "success" ? "success" : "warning"}
            >
                {message}
            </Snackbar>
        </Box>
    );
};
export default ReviewPage;
