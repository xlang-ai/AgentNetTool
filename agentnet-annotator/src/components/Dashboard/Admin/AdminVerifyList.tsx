import * as React from "react";
import { useMain } from "../../../context/MainContext";
import { useEffect } from "react";
import { iconButtonClasses } from "@mui/joy/IconButton";
import {
    Box,
    Button,
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
    Typography,
    Stack,
    LinearProgress,
    Autocomplete,
} from "@mui/joy";
// import { Autocomplete, TextField } from "@mui/material";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import SearchIcon from "@mui/icons-material/Search";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import { useAdminDashboard } from "../../../context/AdminDashboardContext";

export interface adminRecordingProp {
    recording_id: string;
    upload_timestamp: string;
    s3_path: string;
    status: string;
    uploader_id: string;
    verifier_id: string;
    uploader_name: string;
    verifier_name: string;
    task_name: string;
    task_description: string;
    verify_feedback: Record<string, string>;
    downloaded: boolean;
    visualizable: boolean;
}

export interface userInfoProp {
    user_id: string;
    user_name: string;
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
    a: { [key in Key]: number | string },
    b: { [key in Key]: number | string }
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

const getStatusTag = (status: string, feedback: Record<string, string>) => {
    switch (status.toLowerCase()) {
        case "editing":
            return (
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                    Editing
                </span>
            );
        case "accepted":
            return (
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    {feedback?.quality}
                </span>
            );
        case "verifying":
            return (
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                    Verifying
                </span>
            );
        default:
            return (
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    {status}
                </span>
            );
    }
};

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().split("T")[0]; // This will give us YYYY-MM-DD
};

export default function AdminVerifyList() {
    const {
        adminTasks,
        pageidx,
        setPageidx,
        uploaderValue,
        setUploaderValue,
        verifierValue,
        setVerifierValue,
        selectedStatus,
        setSelectedStatus,
        selectedUserSource,
        setSelectedUserSource,
        userDict,
        hasMore,
    } = useAdminDashboard();
    const { fetchAdminTasks } = useMain();

    const [order, setOrder] = React.useState<Order>("desc");
    const [selected, setSelected] = React.useState<adminRecordingProp[]>([]);
    const [open, setOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState<string>("");
    const [downloading, setDownloading] = React.useState(false);
    const [selectedProgress, setSelectedProgress] = React.useState<number[]>(
        []
    );

    const {
        showSuccess,
        showInfo,
        showError,
        SocketService,
        fetchNewTasksToVerify,
    } = useMain();

    const handleUploaderChange = (
        event:
            | React.MouseEvent<Element>
            | React.KeyboardEvent<Element>
            | React.FocusEvent<Element>,
        value: userInfoProp | null
    ) => {
        setPageidx(0);
        if (value == null) {
            setUploaderValue(null);
        } else {
            setUploaderValue(value);
            setVerifierValue(null); // reset verifier
        }
    };
    const handleVerifierChange = (
        event:
            | React.MouseEvent<Element>
            | React.KeyboardEvent<Element>
            | React.FocusEvent<Element>,
        value: userInfoProp | null
    ) => {
        setPageidx(0);
        if (value == null) {
            setVerifierValue(null);
        } else {
            setVerifierValue(value);
            setUploaderValue(null); // reset verifier
        }
    };

    const handleStatusChange = (
        event:
            | React.MouseEvent<Element>
            | React.KeyboardEvent<Element>
            | React.FocusEvent<Element>,
        value: string | null
    ) => {
        setPageidx(0);
        setSelectedStatus(value || "all");
    };

    const handleUserSourceChange = (
        event:
            | React.MouseEvent<Element>
            | React.KeyboardEvent<Element>
            | React.FocusEvent<Element>,
        value: string | null
    ) => {
        setPageidx(0);
        setSelectedUserSource(value || "all");
    };

    const LinearProgressRef = React.useRef(null);
    useEffect(() => {
        if (LinearProgressRef.current) {
            LinearProgressRef.current.value = selectedProgress;
        }
    }, [selectedProgress]);

    // Filter rows based on the search term and selected status
    const filteredRows: adminRecordingProp[] = adminTasks.filter(
        (adminTask) =>
            (adminTask.recording_id
                .toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
                adminTask.uploader_name
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                adminTask.verifier_name
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                adminTask.task_name
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase())) &&
            (selectedStatus === "all" ||
                adminTask.status.toLowerCase() === selectedStatus.toLowerCase())
    );

    // Paginate the filtered rows
    const paginatedRows: adminRecordingProp[] = stableSort(
        filteredRows,
        getComparator(order, "recording_id")
    ) as adminRecordingProp[];

    useEffect(() => {
        console.log(paginatedRows.length);
    }, [paginatedRows]);

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
                    SocketService.Send("download_review_recording", {
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
                        `download_review_recording${selected[i].recording_id}`,
                        (response) => {
                            if (response.status === "succeed") {
                                showSuccess(response.message);
                                downloaded_cnt += 1;
                                if (downloaded_cnt === needdl_cnt) {
                                    showSuccess(
                                        "All recordings have been downloaded"
                                    );
                                    const params = {
                                        page_idx: pageidx,
                                        ...(uploaderValue !== null && {
                                            uploader_id: uploaderValue.user_id,
                                        }),
                                        ...(verifierValue !== null && {
                                            verifier_id: verifierValue.user_id,
                                        }),
                                        ...(selectedStatus !== "all" && {
                                            status: selectedStatus,
                                        }),
                                    };
                                    fetchAdminTasks(params);
                                    fetchNewTasksToVerify();
                                    setDownloading(false);
                                }
                            } else {
                                showError(response.message);
                                needdl_cnt -= 1;
                                if (downloaded_cnt === needdl_cnt) {
                                    showInfo("Download ended.");
                                    const params = {
                                        page_idx: pageidx,
                                        ...(uploaderValue !== null && {
                                            uploader_id: uploaderValue.user_id,
                                        }),
                                        ...(verifierValue !== null && {
                                            verifier_id: verifierValue.user_id,
                                        }),
                                        ...(selectedStatus !== "all" && {
                                            status: selectedStatus,
                                        }),
                                        ...(selectedUserSource !== "all" && {
                                            user_source: selectedUserSource,
                                        }),
                                    };
                                    fetchAdminTasks(params);
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
        <Box sx={{ m: 3 }}>
            <Stack spacing={2} direction="column">
                <Sheet
                    className="SearchAndFilters-mobile"
                    sx={{
                        display: { xs: "flex", sm: "none" },
                        my: 1,
                        gap: 1,
                    }}
                >
                    <Input
                        size="sm"
                        placeholder="Search"
                        startDecorator={<SearchIcon />}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        sx={{ flexGrow: 1 }}
                    />
                    <IconButton
                        size="sm"
                        variant="outlined"
                        color="neutral"
                        onClick={() => setOpen(true)}
                    >
                        <FilterAltIcon />
                    </IconButton>
                </Sheet>
                <Box
                    className="SearchAndFilters-tabletUp"
                    sx={{
                        borderRadius: "sm",
                        py: 2,
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
                        <Button onClick={handleDownloadTasks}>Download</Button>
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
                    <FormControl size="sm">
                        <FormLabel>Status</FormLabel>
                        <Select
                            size="sm"
                            placeholder="Filter by status"
                            onChange={handleStatusChange}
                            value={selectedStatus}
                            slotProps={{
                                button: { sx: { whiteSpace: "nowrap" } },
                            }}
                        >
                            <Option value="all">All</Option>
                            <Option value="editing">Editing</Option>
                            <Option value="accepted">Accepted</Option>
                            <Option value="verifying">Verifying</Option>
                        </Select>
                    </FormControl>
                    <FormControl size="sm">
                        <FormLabel>User Source</FormLabel>
                        <Select
                            size="sm"
                            placeholder="Filter by User Source"
                            onChange={handleUserSourceChange}
                            value={selectedUserSource}
                            slotProps={{
                                button: { sx: { whiteSpace: "nowrap" } },
                            }}
                        >
                            <Option value="all">All</Option>
                            <Option value="external">External</Option>
                            <Option value="internal">Internal</Option>
                            <Option value="company">Company</Option>
                            <Option value="prolific">Prolific</Option>
                        </Select>
                    </FormControl>
                    <FormControl size="sm">
                        <FormLabel>Uploader</FormLabel>
                        <Autocomplete
                            options={Object.entries(userDict)
                                .map(([id, name]) => ({
                                    user_id: id,
                                    user_name: name,
                                }))
                                .sort((a, b) =>
                                    a.user_name.localeCompare(b.user_name)
                                )}
                            filterOptions={(options, { inputValue }) => {
                                const filteredOptions = options.filter(
                                    (option) =>
                                        option.user_name
                                            .toLowerCase()
                                            .includes(
                                                inputValue.toLowerCase()
                                            ) ||
                                        option.user_id
                                            .toLowerCase()
                                            .includes(inputValue.toLowerCase())
                                );
                                console.log(
                                    "Filtered Options:",
                                    filteredOptions
                                );
                                return filteredOptions;
                            }}
                            value={uploaderValue}
                            multiple={false}
                            getOptionLabel={(option: userInfoProp) =>
                                option.user_name
                            }
                            onChange={(
                                event: any,
                                newValue: userInfoProp | null
                            ) => {
                                handleUploaderChange(event, newValue);
                            }}
                            renderOption={(props, option) => (
                                <Box
                                    component={"li"}
                                    {...props}
                                    key={option.user_id}
                                    sx={{
                                        padding: "10px",
                                        fontSize: "16px",
                                        "&:hover": {
                                            backgroundColor: "#f0f0f0",
                                        },
                                    }}
                                >
                                    <Typography level="body-md">
                                        {option.user_name}
                                    </Typography>
                                    <Typography level="body-xs">
                                        {option.user_id}
                                    </Typography>
                                </Box>
                            )}
                        />
                    </FormControl>
                    <FormControl size="sm">
                        <FormLabel>Verifier</FormLabel>
                        <Autocomplete
                            options={Object.entries(userDict)
                                .map(([id, name]) => ({
                                    user_id: id,
                                    user_name: name,
                                }))
                                .sort((a, b) =>
                                    a.user_name.localeCompare(b.user_name)
                                )}
                            filterOptions={(options, { inputValue }) => {
                                const filteredOptions = options.filter(
                                    (option) =>
                                        option.user_name
                                            .toLowerCase()
                                            .includes(
                                                inputValue.toLowerCase()
                                            ) ||
                                        option.user_id
                                            .toLowerCase()
                                            .includes(inputValue.toLowerCase())
                                );
                                console.log(
                                    "Filtered Options:",
                                    filteredOptions
                                );
                                return filteredOptions;
                            }}
                            value={verifierValue}
                            multiple={false}
                            getOptionLabel={(option: userInfoProp) =>
                                option.user_name
                            }
                            onChange={(
                                event: any,
                                newValue: userInfoProp | null
                            ) => {
                                handleVerifierChange(event, newValue);
                            }}
                            renderOption={(props, option) => (
                                <Box
                                    component={"li"}
                                    {...props}
                                    key={option.user_id}
                                    sx={{
                                        padding: "10px",
                                        fontSize: "16px",
                                        "&:hover": {
                                            backgroundColor: "#f0f0f0",
                                        },
                                    }}
                                >
                                    <Typography level="body-md">
                                        {option.user_name}
                                    </Typography>
                                    <Typography level="body-xs">
                                        {option.user_id}
                                    </Typography>
                                </Box>
                            )}
                        />
                    </FormControl>
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
                                        padding: "12px 6px",
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
                                        sx={{ verticalAlign: "text-bottom" }}
                                    />
                                </th>
                                <th
                                    style={{
                                        width: "42.5%",
                                        padding: "12px 6px",
                                    }}
                                >
                                    <Link
                                        underline="none"
                                        color="primary"
                                        component="button"
                                        onClick={() =>
                                            setOrder(
                                                order === "asc" ? "desc" : "asc"
                                            )
                                        }
                                        fontWeight="lg"
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
                                        Task
                                    </Link>
                                </th>
                                <th
                                    style={{
                                        width: "10%",
                                        padding: "12px 6px",
                                    }}
                                >
                                    Upload Time
                                </th>
                                <th
                                    style={{
                                        width: "10%",
                                        padding: "12px 6px",
                                    }}
                                >
                                    Status
                                </th>
                                <th
                                    style={{
                                        width: "15%",
                                        padding: "12px 6px",
                                    }}
                                >
                                    Uploader
                                </th>
                                <th
                                    style={{
                                        width: "15%",
                                        padding: "12px 6px",
                                    }}
                                >
                                    Verifier
                                </th>
                                <th
                                    style={{
                                        width: "7.5%",
                                        padding: "12px 6px",
                                    }}
                                >
                                    Downloaded?
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedRows.map((row) => (
                                <tr
                                    key={`${row.recording_id}${row.upload_timestamp}`}
                                >
                                    <td
                                        style={{
                                            textAlign: "center",
                                            width: 120,
                                        }}
                                    >
                                        {" "}
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
                                                                  selrow.recording_id !==
                                                                  row.recording_id
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
                                        {row.downloaded ? (
                                            <Link
                                                href={`#reviewtasks/${row.recording_id}`}
                                            >
                                                <p className="text-xs text-indigo-700 dark:text-indigo-300">
                                                    {row.task_name}
                                                </p>
                                            </Link>
                                        ) : (
                                            <p className="text-xs">
                                                {row.task_name}
                                            </p>
                                        )}
                                        {selected.includes(row) &&
                                            downloading && (
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
                                            )}
                                    </td>

                                    <td>
                                        <p className="text-xs">
                                            {formatDate(row.upload_timestamp)}
                                        </p>
                                    </td>
                                    <td>{getStatusTag(row.status,row.verify_feedback)}</td>
                                    <td>
                                        <p className="text-xs">
                                            {row.uploader_name}
                                        </p>
                                    </td>
                                    <td>
                                        <p className="text-xs">
                                            {row.verifier_name}
                                        </p>
                                    </td>
                                    <td>
                                        <p className="text-xs">
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
                                        </p>{" "}
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
