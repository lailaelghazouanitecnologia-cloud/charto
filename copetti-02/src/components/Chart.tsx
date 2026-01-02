import { useEffect, useRef } from "react";
import { createChart, type Candle } from "../core/chart.ts";

interface ChartProps {
    data: Candle[];
    width?: number;
    height?: number;
    className?: string;
}

export function Chart({
    data,
    width = 800,
    height = 400,
    className = "",
}: ChartProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<ReturnType<typeof createChart> | null>(null);

    useEffect(() => {
        if (canvasRef.current === null) return;

        chartRef.current = createChart(canvasRef.current, {
            width,
            height,
            backgroundColor: "#0f0f14",
            gridColor: "#1a1a24",
            upColor: "#26a69a",
            downColor: "#ef5350",
        });

        return () => {
            chartRef.current = null;
        };
    }, [width, height]);

    useEffect(() => {
        if (chartRef.current !== null && data.length > 0) {
            chartRef.current.setData(data);
        }
    }, [data]);

    return (
        <div className={`inline-block rounded-lg bg-[#1a1a24] p-4 ${className}`}>
            <canvas ref={canvasRef} />
        </div>
    );
}
