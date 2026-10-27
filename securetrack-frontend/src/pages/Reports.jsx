import React, { useState, useEffect } from 'react';
import { Download, TrendingUp, TrendingDown } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import api from '../api'; 

function TrendBadge({ trend, direction }) {
  const Icon = direction === 'up' ? TrendingUp : TrendingDown;
  const tone = direction === 'up' ? 'text-green-600' : 'text-red-500';
  return (
    <span className={`mt-1 flex items-center gap-1 text-xs font-medium ${tone}`}>
      <Icon size={13} />
      {trend}
    </span>
  );
}

const ALERT_THEME_COLORS = [
  '#0B3A5A', // Primary dark blue
  '#22c55e', // Green
  '#ef4444', // Red accent
  '#f97316', // Orange accent
  '#0ea5e9', // Sky blue
  '#8b5cf6', // Violet
  '#f59e0b', // Amber
];

function Reports() {
  const [reportData, setReportData] = useState({
    statCards: [],
    shipmentActivity: [],
    alertDistribution: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [reportType, setReportType] = useState('Shipment Summary');
  const [dateRangeType, setDateRangeType] = useState('last-week');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [exportFormat, setExportFormat] = useState('PDF');

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        const response = await api.get('/api/reports/summary');
        setReportData(response.data);
      } catch (error) {
        console.error("Error fetching report data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReportData();
  }, []);

  const getSelectedDateRange = () => {
    const presetLabels = {
      'last-week': 'Last Week',
      'last-month': 'Last Month',
      'last-6-months': 'Last 6 Months',
      'all-time': 'All Time',
    };

    if (dateRangeType !== 'custom') {
      return presetLabels[dateRangeType];
    }

    if (!customStartDate || !customEndDate) {
      return 'Custom Range (select start and end dates)';
    }

    const formatDate = (date) => new Date(`${date}T00:00:00`).toLocaleDateString();
    return `${formatDate(customStartDate)} - ${formatDate(customEndDate)}`;
  };

  const handleGenerateReport = async () => {
    const selectedDateRange = getSelectedDateRange();
    const officerActivity = [
      ['Alex Morgan', 'Shipment inspections', '24', 'Completed'],
      ['Jordan Lee', 'Alert reviews', '18', 'Completed'],
      ['Taylor Smith', 'Route assignments', '12', 'In progress'],
    ];

    let columns;
    let rows;

    if (reportType === 'Alert Summary') {
      columns = ['Alert Type', 'Count'];
      rows = reportData.alertDistribution.map(({ name, value }) => [name, value]);
    } else if (reportType === 'Officer Activity') {
      columns = ['Officer', 'Activity', 'Count', 'Status'];
      rows = officerActivity;
    } else {
      columns = ['Day', 'Shipments', 'Completed'];
      rows = reportData.shipmentActivity.map(({ day, shipments, completed }) => [day, shipments, completed]);
    }

    if (exportFormat === 'CSV') {
      const csvContent = [columns, ...rows]
        .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\n');
      const csvUrl = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
      const csvLink = document.createElement('a');
      csvLink.href = csvUrl;
      csvLink.download = 'SecureTrack_Report.csv';
      csvLink.click();
      URL.revokeObjectURL(csvUrl);
      return;
    }

    if (exportFormat === 'Excel') {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet([
        ['SecureTrack Report'],
        ['Report Type', reportType],
        ['Date Range', selectedDateRange],
        [],
        columns,
        ...rows,
      ]);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
      XLSX.writeFile(workbook, 'SecureTrack_Report.xlsx');
      return;
    }

    const pdfDoc = new jsPDF();
    const pageWidth = pdfDoc.internal.pageSize.getWidth();
    const summaryCards = reportData.statCards.slice(0, 4);

    pdfDoc.setFillColor(11, 58, 90);
    pdfDoc.rect(0, 0, pageWidth, 44, 'F');
    pdfDoc.setFontSize(20);
    pdfDoc.setTextColor(255, 255, 255);
    pdfDoc.text('SecureTrack Report', 14, 19);
    pdfDoc.setFontSize(11);
    pdfDoc.setTextColor(226, 232, 240);
    pdfDoc.text(`${reportType}  |  ${selectedDateRange}`, 14, 30);

    summaryCards.forEach(({ label, value, trend, direction }, index) => {
      const gap = 4;
      const cardWidth = (pageWidth - 28 - (gap * 3)) / 4;
      const x = 14 + (index * (cardWidth + gap));
      pdfDoc.setFillColor(248, 250, 252);
      pdfDoc.roundedRect(x, 52, cardWidth, 23, 2, 2, 'F');
      pdfDoc.setFontSize(8);
      pdfDoc.setTextColor(100, 116, 139);
      pdfDoc.text(label, x + 4, 59);
      pdfDoc.setFontSize(13);
      pdfDoc.setTextColor(15, 23, 42);
      pdfDoc.text(String(value), x + 4, 68);
      pdfDoc.setFontSize(8);
      pdfDoc.setTextColor(direction === 'up' ? 22 : 220, direction === 'up' ? 163 : 38, direction === 'up' ? 74 : 38);
      pdfDoc.text(trend || '', x + 4, 73);
    });

    const drawBarChart = (title, labels, series, x, y, width, height) => {
      pdfDoc.setFontSize(10);
      pdfDoc.setTextColor(15, 23, 42);
      pdfDoc.text(title, x, y);
      const chartTop = y + 6;
      const chartHeight = height - 18;
      const chartWidth = width - 8;
      const maxValue = Math.max(...series.flatMap(({ values }) => values), 1);
      pdfDoc.setDrawColor(203, 213, 225);
      pdfDoc.line(x, chartTop + chartHeight, x + chartWidth, chartTop + chartHeight);
      labels.forEach((label, labelIndex) => {
        const groupWidth = chartWidth / labels.length;
        const barWidth = Math.min(8, (groupWidth - 4) / series.length);
        series.forEach(({ values, color }, seriesIndex) => {
          const barHeight = (values[labelIndex] / maxValue) * chartHeight;
          const barX = x + (labelIndex * groupWidth) + 2 + (seriesIndex * barWidth);
          pdfDoc.setFillColor(...color);
          pdfDoc.rect(barX, chartTop + chartHeight - barHeight, barWidth - 1, barHeight, 'F');
        });
        pdfDoc.setFontSize(7);
        pdfDoc.setTextColor(100, 116, 139);
        pdfDoc.text(String(label), x + (labelIndex * groupWidth) + 2, chartTop + chartHeight + 8, { angle: 0 });
      });
    };

    const chartY = summaryCards.length ? 84 : 52;
    const activityLabels = reportType === 'Officer Activity'
      ? officerActivity.map(([officer]) => officer.split(' ')[0])
      : reportData.shipmentActivity.map(({ day }) => day);
    const activityValues = reportType === 'Officer Activity'
      ? officerActivity.map(([, , count]) => Number(count))
      : reportData.shipmentActivity.map(({ shipments }) => Number(shipments));
    drawBarChart(
      reportType === 'Officer Activity' ? 'Officer Activity' : 'Shipment Activity',
      activityLabels,
      [{ values: activityValues, color: [11, 58, 90] }],
      14,
      chartY,
      86,
      54,
    );
    drawBarChart(
      'Alert Distribution',
      reportData.alertDistribution.map(({ name }) => name),
      [{ values: reportData.alertDistribution.map(({ value }) => Number(value)), color: [34, 197, 94] }],
      108,
      chartY,
      88,
      54,
    );

    autoTable(pdfDoc, {
      startY: chartY + 62,
      head: [columns],
      body: rows,
      headStyles: { fillColor: [11, 58, 90] },
      styles: { fontSize: 10, cellPadding: 3 },
      didDrawPage: ({ pageNumber }) => {
        pdfDoc.setFontSize(8);
        pdfDoc.setTextColor(100, 116, 139);
        pdfDoc.text(`SecureTrack  |  Page ${pageNumber}`, 14, pdfDoc.internal.pageSize.getHeight() - 10);
      },
    });
    pdfDoc.save('SecureTrack_Report.pdf');
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading reports data...</div>;
  }

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Reports &amp; Analytics</h2>
          <p className="mt-1 text-sm text-slate-500">Generate and download system reports</p>
        </div>
        <button
          type="button"
          onClick={handleGenerateReport}
          className="flex w-fit items-center gap-2 rounded-lg bg-[#0B3A5A] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0a2f4a]"
        >
          <Download size={16} />
          Generate Report
        </button>
      </div>

      
      <div className="grid grid-cols-1 gap-4 rounded-xl bg-white p-5 shadow-sm sm:grid-cols-3">
        <div>
          <label htmlFor="report-type" className="mb-1.5 block text-sm font-medium text-slate-700">Report Type</label>
          <select id="report-type" value={reportType} onChange={(event) => setReportType(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-slate-700 focus:border-[#0B3A5A] focus:outline-none focus:ring-2 focus:ring-[#0B3A5A]/15">
            <option>Shipment Summary</option>
            <option>Alert Summary</option>
            <option>Officer Activity</option>
          </select>
        </div>
        <div>
          <label htmlFor="date-range" className="mb-1.5 block text-sm font-medium text-slate-700">Date Range</label>
          <select id="date-range" value={dateRangeType} onChange={(event) => setDateRangeType(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-slate-700 focus:border-[#0B3A5A] focus:outline-none focus:ring-2 focus:ring-[#0B3A5A]/15">
            <option value="last-week">Last Week</option>
            <option value="last-month">Last Month</option>
            <option value="last-6-months">Last 6 Months</option>
            <option value="custom">Custom Range</option>
            <option value="all-time">All Time</option>
          </select>
          {dateRangeType === 'custom' && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                aria-label="Custom range start date"
                type="date"
                value={customStartDate}
                onChange={(event) => setCustomStartDate(event.target.value)}
                className="min-w-0 rounded-lg border border-gray-300 px-2 py-2 text-xs text-slate-700 focus:border-[#0B3A5A] focus:outline-none focus:ring-2 focus:ring-[#0B3A5A]/15"
              />
              <input
                aria-label="Custom range end date"
                type="date"
                value={customEndDate}
                min={customStartDate || undefined}
                onChange={(event) => setCustomEndDate(event.target.value)}
                className="min-w-0 rounded-lg border border-gray-300 px-2 py-2 text-xs text-slate-700 focus:border-[#0B3A5A] focus:outline-none focus:ring-2 focus:ring-[#0B3A5A]/15"
              />
            </div>
          )}
        </div>
        <div>
          <label htmlFor="export-format" className="mb-1.5 block text-sm font-medium text-slate-700">Export Format</label>
          <select id="export-format" value={exportFormat} onChange={(event) => setExportFormat(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-slate-700 focus:border-[#0B3A5A] focus:outline-none focus:ring-2 focus:ring-[#0B3A5A]/15">
            <option>PDF</option>
            <option>CSV</option>
            <option>Excel</option>
          </select>
        </div>
      </div>

      
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {reportData.statCards.map(({ label, value, trend, direction }) => (
          <div key={label} className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
            <TrendBadge trend={trend} direction={direction} />
          </div>
        ))}
      </div>

      
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-slate-900">Shipment Activity (This Week)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData.shipmentActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="shipments" name="Shipments" fill="#0B3A5A" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-slate-900">Alert Distribution by Type</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={reportData.alertDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  outerRadius={85}
                >
                  {reportData.alertDistribution.map((entry, index) => (
                    <Cell
                      key={`cell-${entry.name || index}`}
                      fill={ALERT_THEME_COLORS[index % ALERT_THEME_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => {
                    const total = reportData.alertDistribution.reduce(
                      (acc, curr) => acc + (Number(curr.value) || 0),
                      0
                    );
                    const pct = total > 0 ? ((Number(value) / total) * 100).toFixed(1) : 0;
                    return [`${value} alerts (${pct}%)`, name];
                  }}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={10}
                  wrapperStyle={{
                    paddingTop: '16px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    gap: '8px 16px',
                  }}
                  formatter={(value) => (
                    <span className="text-xs font-medium text-slate-700 ml-1">
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Reports;