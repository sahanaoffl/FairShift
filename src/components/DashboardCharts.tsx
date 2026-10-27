"use client";

import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";

const colors = ["#0f6a56", "#e8a43a", "#4078a5", "#a9362b", "#7d67a8", "#5d8a69"];

export default function DashboardCharts({ trend, categories, overtimeByTeam }: {
  trend: { date: string; attendance: number }[];
  categories: { category: string; reports: number }[];
  overtimeByTeam: { role: string; hours: number }[];
}) {
  return <div className="charts-grid">
    <article className="chart-card"><h2>Attendance · 14 days</h2><div className="chart-area"><ResponsiveContainer width="100%" height="100%"><LineChart data={trend}><CartesianGrid strokeDasharray="3 3" stroke="#e1e9e4" /><XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(value: string) => value.slice(5)} /><YAxis allowDecimals={false} width={30} /><Tooltip /><Line type="monotone" dataKey="attendance" name="Check-ins" stroke="#0f6a56" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></div></article>
    <article className="chart-card"><h2>Reports by category</h2><div className="chart-area"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categories} dataKey="reports" nameKey="category" innerRadius={45} outerRadius={78} paddingAngle={3}>{categories.map((entry, index) => <Cell key={entry.category} fill={colors[index % colors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div><div className="chart-legend">{categories.map((item, index) => <span key={item.category}><i style={{ background: colors[index % colors.length] }} />{item.category.replaceAll("_", " ")} · {item.reports}</span>)}</div></article>
    <article className="chart-card"><h2>Overtime by team</h2><div className="chart-area"><ResponsiveContainer width="100%" height="100%"><BarChart data={overtimeByTeam} margin={{ left: 4, right: 8 }}><CartesianGrid strokeDasharray="3 3" stroke="#e1e9e4" /><XAxis dataKey="role" tick={{ fontSize: 10 }} /><YAxis width={35} /><Tooltip /><Bar dataKey="hours" name="Overtime hours" fill="#e8a43a" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></article>
  </div>;
}
