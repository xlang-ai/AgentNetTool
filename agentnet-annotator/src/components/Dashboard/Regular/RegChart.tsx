import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FormControl, FormLabel, Select, Option, Stack, Typography } from '@mui/joy';

interface DataProps {
    name: string; // ISO 日期字符串
    uploaded: number;
    accepted: number;
    rejected: number;
}

interface MyChartProps {
    data: DataProps[];
}

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'd MMM'); // 格式化为 '8 Sep'
}

// 过滤函数
const filterData = (data: DataProps[], filter: string) => {
    const now = new Date();
    let startDate: Date;

    switch (filter) {
        case 'last month':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            break;
        case 'last week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
        case 'last 2 weeks':
            startDate = new Date(now.setDate(now.getDate() - 14));
            break;
        default:
            startDate = new Date(0); // 默认显示所有数据
    }

    return data?.filter((item) => new Date(item.name) >= startDate);
}

const CustomTooltip = ({ payload, label }: any) => {
    if (payload && payload.length) {
        return (
            <div className="custom-tooltip">
                <p className="label">{`Date: ${label}`}</p>
                {payload.map((item: any) => (
                    <p key={item.dataKey} style={{ color: item.stroke }}>{`${item.dataKey}: ${item.value}`}</p>
                ))}
            </div>
        );
    }
    return null;
}

const RegChart = ({ data }: MyChartProps) => {
    const [filter, setFilter] = useState<string>('all');

    // 根据筛选条件过滤数据
    const filteredData = useMemo(() => filterData(data, filter), [data, filter]);
    // const handleStatusChange = (
    //     event:
    //         | React.MouseEvent<Element>
    //         | React.KeyboardEvent<Element>
    //         | React.FocusEvent<Element, Element>,
    //     value: string
    // ) => {
    //     if (value === "all") {
    //         setSelectedStatus(null);
    //     } else {
    //         setSelectedStatus(value);
    //     }
    // };
    const handleFilterChange = (event:
        | React.MouseEvent<Element>
        | React.KeyboardEvent<Element>
        | React.FocusEvent<Element, Element>,
        value: string
    ) => {
        setFilter(value);
    }
    return (
        <div style={{ width: '100%' }} className="flex flex-col items-center">
            <div style={{ width: '95%' }} className="flex justify-between items-center grid grid-cols-5 gap-4">
                <p className="text-2xl font-bold col-span-4">Statistics Overview</p>
                <FormControl size="sm" className="col-span-1 w-full">
                    <FormLabel>Status</FormLabel>
                    <Select
                        size="sm"
                        placeholder="Select Time Range"
                        value={filter}
                        onChange={handleFilterChange}
                    >
                        <Option value="all">All</Option>
                        <Option value="last month">Last Month</Option>
                        <Option value="last week">Last Week</Option>
                        <Option value="last 2 weeks">Last 2 Weeks</Option>
                    </Select>
                </FormControl>
            </div>
            <div key={filter} style={{ width: '95%', height: "20vh" }}>
                <ResponsiveContainer>
                    <AreaChart
                        data={filteredData}
                        margin={{
                            top: 10,
                            right: 30,
                            left: 30,
                            bottom: 10,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey="name"
                            tickFormatter={formatDate} // 使用日期格式化函数
                        />
                        <YAxis domain={[0, 20]} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="uploaded" stroke="#8884d8" fill="#8884d8" />
                        <Area type="monotone" dataKey="accepted" stroke="#82ca9d" fill="#82ca9d" />
                        <Area type="monotone" dataKey="rejected" stroke="#ffc658" fill="#ffc658" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export default RegChart;
