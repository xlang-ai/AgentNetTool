import * as React from "react";
import { useMain } from "../../../context/MainContext";
import { iconButtonClasses } from "@mui/joy/IconButton";
import {
    Box,
    Button,
    Chip,
    FormControl,
    FormLabel,
    Link,
    Input,
    Select,
    Option,
    Table,
    Sheet,
    Checkbox,
    IconButton,
    Stack,
    ColorPaletteProp,
    Tooltip,
    Typography,
    LinearProgress,
} from "@mui/joy";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import BlockIcon from "@mui/icons-material/Block";
import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
interface onlineRecordingProp {
    allocated_timestamp: string | null;
    upload_timestamp: string | null;
    verify_feedback: Record<string, any> | null;
    task_name: string | null;
    task_description: string | null;
    recording_id: string | null;
    downloaded: boolean;
    visualizable: boolean;
    status: string | null;
}

function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
    if (b[orderBy] < a[orderBy]) {
        return -1;
    }
    if (b[orderBy] > a[orderBy]) {
        return 1;
    }
    return 0;
}

type Order = "asc" | "desc";

function getComparator<Key extends keyof any>(
    order: Order,
    orderBy: Key
): (
    a: { [key in Key]: number | string | boolean | Record<string, any> },
    b: { [key in Key]: number | string | boolean | Record<string, any> }
) => number {
    return order === "desc"
        ? (a, b) => descendingComparator(a, b, orderBy)
        : (a, b) => -descendingComparator(a, b, orderBy);
}

function stableSort<T>(
    array: readonly T[],
    comparator: (a: T, b: T) => number
) {
    const stabilizedThis = array.map((el, index) => [el, index] as [T, number]);
    stabilizedThis.sort((a, b) => {
        const order = comparator(a[0], b[0]);
        if (order !== 0) {
            return order;
        }
        return a[1] - b[1];
    });
    return stabilizedThis.map((el) => el[0]);
}

export default function RegAnnotateList() {
    const [order, setOrder] = React.useState<Order>("desc");
    const [compattr, setCompattr] =
        React.useState<keyof onlineRecordingProp>("task_name");
    const [selected, setSelected] = React.useState<onlineRecordingProp[]>([]);
    const [searchTerm, setSearchTerm] = React.useState<string>("");
    const [selectedStatus, setSelectedStatus] = React.useState<string | null>(
        null
    );
    const [selectedProgress, setSelectedProgress] = React.useState<number[]>(
        []
    );

    //const [page, setPage] = React.useState(0);
    const [downloading, setDownloading] = React.useState(false);
    const [pageidx, setPageidx] = React.useState(0);
    const {
        annotatedTasks,
        showError,
        showSuccess,
        showInfo,
        SocketService,
        fetchOutsideTasks,
        user_id,
        hasMore,
        fetchTasks,
    } = useMain();
    const rowsPerPage = 10;

    const LinearProgressRef = React.useRef(null);
    React.useEffect(() => {
        if (LinearProgressRef.current) {
            LinearProgressRef.current.value = selectedProgress;
        }
    }, [selectedProgress]);

    React.useEffect(() => {
        const params = {
            taskType: "annotated",
            page_idx: pageidx,
            verifier_id: user_id,
        };
        fetchOutsideTasks(params);
    }, [pageidx]);

    const filteredRows: onlineRecordingProp[] = annotatedTasks.filter(
        (annotatedTask) => {
            const nameOrId =
                annotatedTask.task_name === undefined ||
                annotatedTask.task_name === ""
                    ? annotatedTask.recording_id
                    : annotatedTask.task_name;

            return (
                nameOrId.toLowerCase().includes(searchTerm.toLowerCase()) &&
                (annotatedTask.status === selectedStatus ||
                    selectedStatus === null)
            );
        }
    );

    const paginatedRows: onlineRecordingProp[] = stableSort(
        filteredRows,
        getComparator(order, compattr)
    ) as onlineRecordingProp[];

    const handleStatusChange = (
        event:
            | React.MouseEvent<Element>
            | React.KeyboardEvent<Element>
            | React.FocusEvent<Element, Element>,
        value: string
    ) => {
        if (value === "all") {
            setSelectedStatus(null);
        } else {
            setSelectedStatus(value);
        }
    };

    const renderFilters = () => (
        <React.Fragment>
            <FormControl size="sm">
                <FormLabel>Status</FormLabel>
                <Select
                    size="sm"
                    placeholder="All"
                    onChange={handleStatusChange}
                    value={selectedStatus || "all"}
                >
                    <Option value="all">All</Option>
                    <Option value="Accepted">Accepted</Option>
                    <Option value="Pending">Pending</Option>
                    <Option value="Rejected">Rejected</Option>
                </Select>
            </FormControl>
        </React.Fragment>
    );

    const handleDownloadTasks = async () => {
        let downloaded_cnt = 0;
        let needdl_cnt = 0;
        try {
            showInfo("Download Recordings...");
            setDownloading(true);
            for (let i = 0; i < selected.length; i++) {
                if (!selected[i].downloaded) {
                    needdl_cnt += 1;
                    console.log(`recording_id: ${selected[i].recording_id}`);
                    SocketService.Send("download_user_recording", {
                        recording_id: selected[i].recording_id,
                    });
                    SocketService.Listen(
                        `download_recording${selected[i].recording_id}/progress`,
                        (response) => {
                            console.log(response);
                            if (response.status === "downloading") {
                                console.log(response.progress);
                                selectedProgress[i] = response.progress;
                                setSelectedProgress([...selectedProgress]);
                            }
                        }
                    );
                    SocketService.ListenOnce(
                        `download_user_recording${selected[i].recording_id}`,
                        (response) => {
                            if (response.status === "succeed") {
                                showSuccess(response.message);
                                downloaded_cnt += 1;
                                if (downloaded_cnt === needdl_cnt) {
                                    showSuccess(
                                        "All recordings have been downloaded"
                                    );
                                    const params = {
                                        taskType: "annotated",
                                        page_idx: pageidx,
                                        verifier_id: user_id,
                                    };
                                    fetchOutsideTasks(params);
                                    fetchTasks();
                                    setDownloading(false);
                                }
                            } else {
                                showError(response.message);
                                needdl_cnt -= 1;
                                if (downloaded_cnt === needdl_cnt) {
                                    showInfo("Download ended.");
                                    const params = {
                                        taskType: "annotated",
                                        page_idx: pageidx,
                                        verifier_id: user_id,
                                    };
                                    fetchOutsideTasks(params);
                                    fetchTasks();
                                    setDownloading(false);
                                }
                            }
                        }
                    );
                }
            }
        } catch (error) {
            console.error("Failed to fetch tasks:", error);
        }
    };

    return (
        <Box sx={{ m: 0, p: 0 }}>
            <Stack spacing={0} direction="column">
                <Box
                    className="SearchAndFilters-tabletUp"
                    sx={{
                        borderRadius: "sm",
                        pb: 1,
                        display: { xs: "none", sm: "flex" },
                        flexWrap: "wrap",
                        gap: 1.5,
                        "& > *": {
                            minWidth: { xs: "120px", md: "160px" },
                        },
                    }}
                >
                    <FormControl sx={{ flex: "0 1 auto" }} size="sm">
                        <FormLabel>Download Selected Tasks</FormLabel>
                        <Button size="sm" onClick={handleDownloadTasks}>
                            Download
                        </Button>
                    </FormControl>

                    <FormControl sx={{ flex: 1 }} size="sm">
                        <FormLabel>Search for task</FormLabel>
                        <Input
                            size="sm"
                            placeholder="Search"
                            startDecorator={<SearchIcon />}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </FormControl>
                    {renderFilters()}
                </Box>
                <Sheet
                    className="OrderTableContainer"
                    variant="outlined"
                    sx={{
                        display: { xs: "none", sm: "initial" },
                        width: "100%",
                        borderRadius: "sm",
                        flexShrink: 1,
                        overflow: "auto",
                        minHeight: 0,
                    }}
                >
                    <Table
                        aria-labelledby="tableTitle"
                        stickyHeader
                        hoverRow
                        sx={{
                            "--TableCell-headBackground":
                                "var(--joy-palette-background-level1)",
                            "--Table-headerUnderlineThickness": "1px",
                            "--TableRow-hoverBackground":
                                "var(--joy-palette-background-level1)",
                            "--TableCell-paddingY": "4px",
                            "--TableCell-paddingX": "8px",
                        }}
                    >
                        <thead>
                            <tr>
                                <th
                                    style={{
                                        width: 48,
                                        textAlign: "center",
                                        padding: "6px 6px",
                                    }}
                                >
                                    <Checkbox
                                        size="sm"
                                        indeterminate={
                                            selected.length > 0 &&
                                            selected.length !==
                                                filteredRows.length
                                        }
                                        checked={
                                            selected.length ===
                                            filteredRows.length
                                        }
                                        onChange={(event) => {
                                            setSelected(
                                                event.target.checked
                                                    ? filteredRows
                                                    : []
                                            );
                                        }}
                                        color={
                                            selected.length > 0 ||
                                            selected.length ===
                                                filteredRows.length
                                                ? "primary"
                                                : undefined
                                        }
                                        sx={{
                                            verticalAlign: "text-bottom",
                                        }}
                                    />
                                </th>
                                <th
                                    style={{
                                        width: "7.5%",
                                        padding: "6px 6px",
                                    }}
                                >
                                    <Link
                                        underline="none"
                                        component="button"
                                        color="neutral"
                                        onClick={() => {
                                            setOrder(
                                                order === "asc" ? "desc" : "asc"
                                            );
                                            setCompattr("status");
                                        }}
                                        endDecorator={<ArrowDropDownIcon />}
                                        sx={{
                                            "& svg": {
                                                transition: "0.2s",
                                                transform:
                                                    order === "desc"
                                                        ? "rotate(0deg)"
                                                        : "rotate(180deg)",
                                            },
                                        }}
                                    >
                                        Status
                                    </Link>
                                </th>
                                <th
                                    style={{
                                        width: "15%",
                                        padding: "6px 6px",
                                    }}
                                >
                                    <div>verify_feedback</div>
                                </th>

                                <th
                                    style={{
                                        width: "50%",
                                        padding: "6px 6px",
                                    }}
                                >
                                    <Link
                                        underline="none"
                                        component="button"
                                        color="neutral"
                                        onClick={() => {
                                            setOrder(
                                                order === "asc" ? "desc" : "asc"
                                            );
                                            setCompattr("task_name");
                                        }}
                                        endDecorator={<ArrowDropDownIcon />}
                                        sx={{
                                            "& svg": {
                                                transition: "0.2s",
                                                transform:
                                                    order === "desc"
                                                        ? "rotate(0deg)"
                                                        : "rotate(180deg)",
                                            },
                                            display: "flex",
                                            justifyContent: "center",
                                            alignItems: "center",
                                        }}
                                    >
                                        TaskName
                                    </Link>
                                </th>

                                <th
                                    style={{
                                        width: "10%",
                                        padding: "6px 6px",
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "center",
                                            alignItems: "center",
                                        }}
                                    >
                                        upload_timestamp
                                    </div>
                                </th>
                                <th
                                    style={{
                                        width: "7.5%",
                                        padding: "6px 6px",
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "center",
                                            alignItems: "center",
                                        }}
                                    >
                                        Downloaded?
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedRows.map((row) => (
                                <tr key={row.task_name} style={{ height: 48 }}>
                                    <td
                                        style={{
                                            textAlign: "center",
                                            width: 120,
                                        }}
                                    >
                                        <Checkbox
                                            size="sm"
                                            checked={selected.includes(row)}
                                            color={
                                                selected.includes(row)
                                                    ? "primary"
                                                    : undefined
                                            }
                                            onChange={(event) => {
                                                setSelected((selrows) =>
                                                    event.target.checked
                                                        ? selrows.concat(row)
                                                        : selrows.filter(
                                                              (selrow) =>
                                                                  selrow !== row
                                                          )
                                                );
                                            }}
                                            slotProps={{
                                                checkbox: {
                                                    sx: {
                                                        textAlign: "left",
                                                    },
                                                },
                                            }}
                                            sx={{
                                                verticalAlign: "text-bottom",
                                            }}
                                        />
                                    </td>
                                    <td>
                                        <Chip
                                            variant="soft"
                                            size="sm"
                                            startDecorator={
                                                {
                                                    accepted: (
                                                        <CheckRoundedIcon />
                                                    ),
                                                    verifying: (
                                                        <AutorenewRoundedIcon />
                                                    ),
                                                    editing: (
                                                        <EditRoundedIcon />
                                                    ),
                                                    rejected: <BlockIcon />,
                                                }[row.status]
                                            }
                                            color={
                                                {
                                                    accepted: "success",
                                                    verifying: "neutral",
                                                    editing: "primary",
                                                    rejected: "danger",
                                                }[
                                                    row.status
                                                ] as ColorPaletteProp
                                            }
                                        >
                                            {row.status}
                                        </Chip>
                                    </td>
                                    <td
                                        style={{
                                            whiteSpace: "normal", // Allow text to wrap
                                            overflow: "hidden", // Prevent overflowing content
                                            wordWrap: "break-word", // Break long words if necessary
                                        }}
                                    >
                                        {row.status !== "verifying" && (
                                            // <Chip
                                            //     variant="soft"
                                            //     size="sm"
                                            //     color={
                                            //         {
                                            //             accepted: "success",
                                            //             verifying: "neutral",
                                            //             editing: "primary",
                                            //             rejected: "danger",
                                            //         }[
                                            //             row.status
                                            //         ] as ColorPaletteProp
                                            //     }
                                            // >
                                            //     {row.verify_feedback.quality
                                            //         ? row.verify_feedback
                                            //               .quality
                                            //         : row.verify_feedback
                                            //               .feedback}
                                            // </Chip>
                                            <Typography level="body-xs">
                                                {row.verify_feedback.quality
                                                    ? row.verify_feedback
                                                          .quality
                                                    : row.verify_feedback
                                                          .feedback}
                                            </Typography>
                                        )}
                                    </td>

                                    {row.downloaded ? (
                                        <td>
                                            <Link
                                                href={`#tasks/${row.recording_id}`}
                                                underline="none"
                                                color="primary"
                                            >
                                                <Typography
                                                    level="body-xs"
                                                    color="primary"
                                                >
                                                    {row.task_name}
                                                </Typography>
                                                <LinearProgress
                                                    ref={LinearProgressRef}
                                                    determinate
                                                    value={
                                                        selectedProgress[
                                                            selected.indexOf(
                                                                row
                                                            )
                                                        ]
                                                    }
                                                />
                                            </Link>{" "}
                                        </td>
                                    ) : selected.includes(row) &&
                                      downloading ? (
                                        <td>
                                            {" "}
                                            <Typography level="body-xs">
                                                {row.task_name}
                                            </Typography>
                                            <LinearProgress
                                                ref={LinearProgressRef}
                                                determinate
                                                value={
                                                    selectedProgress[
                                                        selected.indexOf(row)
                                                    ]
                                                }
                                            />{" "}
                                        </td>
                                    ) : (
                                        <td>
                                            {" "}
                                            <Typography level="body-xs">
                                                {row.task_name}
                                            </Typography>
                                        </td>
                                    )}

                                    <td>
                                        {" "}
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "center",
                                                alignItems: "center",
                                            }}
                                        >
                                            {row.upload_timestamp}
                                        </div>
                                    </td>
                                    <td>
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "center",
                                                alignItems: "center",
                                            }}
                                        >
                                            <Typography component="td">
                                                {row.downloaded ? (
                                                    <CheckIcon
                                                        style={{
                                                            color: "green",
                                                        }}
                                                    />
                                                ) : (
                                                    <CloseIcon
                                                        style={{ color: "red" }}
                                                    />
                                                )}
                                            </Typography>{" "}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Sheet>
                <Box
                    className="Pagination-laptopUp"
                    sx={{
                        pt: 2,
                        gap: 1,
                        [`& .${iconButtonClasses.root}`]: {
                            borderRadius: "50%",
                        },
                        display: {
                            xs: "none",
                            md: "flex",
                        },
                    }}
                >
                    <Button
                        size="sm"
                        variant="outlined"
                        color="neutral"
                        startDecorator={<KeyboardArrowLeftIcon />}
                        onClick={() => setPageidx((prev) => prev - 1)}
                        disabled={pageidx === 0}
                    >
                        Previous
                    </Button>

                    <Button
                        size="sm"
                        variant="outlined"
                        color="neutral"
                        endDecorator={<KeyboardArrowRightIcon />}
                        onClick={() => setPageidx((prev) => prev + 1)}
                        disabled={!hasMore}
                    >
                        Next
                    </Button>
                </Box>
            </Stack>
        </Box>
    );
}
