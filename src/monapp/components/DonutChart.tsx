import React from 'react';

export interface DonutChartData {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutChartData[];
  size?: number;
  strokeWidth?: number;
  title?: string;
  subtitle?: string;
  variant?: 'donut' | 'pie';
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  size = 200,
  strokeWidth = 20,
  title,
  subtitle,
  variant = 'pie'
}) => {
  const actualStrokeWidth = variant === 'pie' ? size / 2 : strokeWidth;
  const radius = variant === 'pie' ? size / 4 : (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  const total = data.reduce((acc, item) => acc + item.value, 0);
  
  let currentOffset = 0;
  
  return (
    <div className={`flex ${variant === 'pie' ? 'flex-col md:flex-row' : 'flex-col'} items-center gap-6 w-full justify-center`}>
      {/* Title above chart for Pie variant */}
      {variant === 'pie' && title && (
        <div className="flex flex-col items-center justify-center text-center md:hidden">
          <span className="text-2xl font-black text-theme-text-primary leading-none">
            {title}
          </span>
          {subtitle && (
            <span className="text-[9px] font-bold text-theme-text-secondary uppercase tracking-widest mt-1">
              {subtitle}
            </span>
          )}
        </div>
      )}

      <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90 transform overflow-visible">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={actualStrokeWidth}
            className="text-theme-border/30"
          />
          
          {/* Data segments */}
          {total > 0 && data.map((item, index) => {
            const percentage = item.value / total;
            const strokeDashoffset = circumference - percentage * circumference;
            const offset = currentOffset;
            
            // Calculate next offset
            currentOffset += percentage * circumference;

            // Calculations for labels and borders (only for pie)
            const middleOffset = offset + (percentage * circumference) / 2;
            const middleAngleDeg = (middleOffset / circumference) * 360;
            const middleAngleRad = middleAngleDeg * (Math.PI / 180);
            
            // Distance from center for text
            const textRadius = size / 3.5;
            const textX = size / 2 + textRadius * Math.cos(middleAngleRad);
            const textY = size / 2 + textRadius * Math.sin(middleAngleRad);

            // Border line angle
            const startAngleDeg = (offset / circumference) * 360;
            const startAngleRad = startAngleDeg * (Math.PI / 180);
            const lineX = size / 2 + (size / 2) * Math.cos(startAngleRad);
            const lineY = size / 2 + (size / 2) * Math.sin(startAngleRad);

            return (
              <g key={index}>
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth={actualStrokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap={percentage > 0.99 ? "butt" : "butt"}
                  className="transition-all duration-1000 ease-in-out hover:opacity-90"
                  style={{
                    transformOrigin: 'center',
                    transform: `rotate(${(offset / circumference) * 360}deg)`
                  }}
                />
                
                {/* Border line between slices (only for pie) */}
                {variant === 'pie' && percentage < 1 && (
                  <line 
                    x1={size / 2} 
                    y1={size / 2} 
                    x2={lineX} 
                    y2={lineY} 
                    stroke="var(--color-theme-surface, white)" 
                    strokeWidth="2" 
                  />
                )}

                {/* Percentage text inside slice (only for pie if large enough) */}
                {variant === 'pie' && percentage > 0.05 && (
                  <text
                    x={textX}
                    y={textY}
                    fill="white"
                    fontSize="12"
                    fontWeight="bold"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(90, ${textX}, ${textY})`}
                    className="drop-shadow-md pointer-events-none"
                  >
                    {Math.round(percentage * 100)}%
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Center Text for Donut variant */}
        {variant === 'donut' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-2xl font-black text-theme-text-primary leading-none">
              {title || total}
            </span>
            {subtitle && (
              <span className="text-[9px] font-bold text-theme-text-secondary uppercase tracking-widest mt-1">
                {subtitle}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className={`flex ${variant === 'pie' ? 'flex-col gap-3' : 'flex-wrap justify-center gap-4'} w-full md:w-auto min-w-[120px]`}>
        {/* Title above legend for Pie variant on Desktop */}
        {variant === 'pie' && title && (
          <div className="hidden md:flex flex-col mb-2">
            <span className="text-xl font-black text-theme-text-primary leading-none">
              {title}
            </span>
            {subtitle && (
              <span className="text-[9px] font-bold text-theme-text-secondary uppercase tracking-widest mt-0.5">
                {subtitle}
              </span>
            )}
          </div>
        )}
        
        {data.map((item, index) => {
          const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <div key={index} className="flex items-center gap-2.5">
              <span 
                className="w-3.5 h-3.5 rounded-full shadow-sm shrink-0" 
                style={{ backgroundColor: item.color }} 
              />
              <div className="flex flex-col">
                <span className="text-xs font-black text-theme-text-primary tracking-tight leading-none">
                  {item.label}
                </span>
                {variant === 'donut' && (
                  <span className="text-[9px] font-bold text-theme-text-secondary uppercase mt-0.5">
                    {item.value} ({percentage}%)
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
