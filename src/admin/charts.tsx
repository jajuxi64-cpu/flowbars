import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement,
  Tooltip, Legend, Filler, RadialLinearScale,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, RadialLinearScale, Tooltip, Legend, Filler);

ChartJS.defaults.color = "#737373";
ChartJS.defaults.font.family = "'JetBrains Mono', monospace";
ChartJS.defaults.font.size = 10;
ChartJS.defaults.plugins.legend.display = false;

const grid = { color: "rgba(255,255,255,0.05)", drawBorder: false } as any;

export function LineChart({ labels, data, color = "#dc2626", height = 180, fill = true }: any) {
  return (
    <div style={{ height }}>
      <Line
        data={{
          labels,
          datasets: [
            {
              data,
              borderColor: color,
              backgroundColor: fill ? `${color}22` : "transparent",
              fill,
              tension: 0.35,
              pointRadius: 0,
              pointHoverRadius: 4,
              borderWidth: 2,
            },
          ],
        }}
        options={{
          maintainAspectRatio: false,
          plugins: { tooltip: { backgroundColor: "#0a0a0a", borderColor: "#262626", borderWidth: 1, displayColors: false } },
          scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } }, y: { grid, ticks: { precision: 0 } } },
        }}
      />
    </div>
  );
}

export function BarChart({ labels, data, color = "#dc2626", height = 180, horizontal }: any) {
  return (
    <div style={{ height }}>
      <Bar
        data={{ labels, datasets: [{ data, backgroundColor: color, borderRadius: 2, barThickness: horizontal ? 12 : undefined }] }}
        options={{
          indexAxis: horizontal ? "y" : "x",
          maintainAspectRatio: false,
          plugins: { tooltip: { backgroundColor: "#0a0a0a", displayColors: false } },
          scales: { x: { grid: horizontal ? grid : { display: false } }, y: { grid: horizontal ? { display: false } : grid, ticks: { precision: 0 } } },
        }}
      />
    </div>
  );
}

export function DoughnutChart({ labels, data, colors, height = 180 }: any) {
  return (
    <div style={{ height }}>
      <Doughnut
        data={{ labels, datasets: [{ data, backgroundColor: colors, borderColor: "#0a0a0a", borderWidth: 2 }] }}
        options={{ maintainAspectRatio: false, cutout: "62%", plugins: { legend: { display: true, position: "bottom", labels: { boxWidth: 8, padding: 10 } } } }}
      />
    </div>
  );
}
