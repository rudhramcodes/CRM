import { createContext, useContext, useId, useMemo } from 'react';
import * as RechartsPrimitive from 'recharts';
import { cn } from '../../utils/cn';

const ChartContext = createContext(null);

function useChart() {
  const context = useContext(ChartContext);
  if (!context) throw new Error('useChart must be used within a <ChartContainer />');
  return context;
}

function ChartContainer({ id, className, children, config, ...props }) {
  const uniqueId = useId();
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, '')}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "flex justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-zinc-500 [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-zinc-200/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-zinc-200 [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-zinc-200 [&_.recharts-radial-bar-background-sector]:fill-zinc-100 [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-zinc-100 [&_.recharts-reference-line_[stroke='#ccc']]:stroke-zinc-200 [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

const ChartTooltip = RechartsPrimitive.Tooltip;

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = 'dot',
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
}) {
  const { config } = useChart();

  const tooltipLabel = useMemo(() => {
    if (hideLabel || !payload?.length) return null;
    const [item] = payload;
    const key = `${labelKey ?? item?.dataKey ?? item?.name ?? 'value'}`;
    const itemConfig = getPayloadConfigFromPayload(config, item, key);
    const value = !labelKey && typeof label === 'string'
      ? (config[label]?.label ?? label)
      : itemConfig?.label;

    if (labelFormatter) {
      return <div className={cn('font-medium', labelClassName)}>{labelFormatter(value, payload)}</div>;
    }
    if (!value) return null;
    return <div className={cn('font-medium', labelClassName)}>{value}</div>;
  }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey]);

  if (!active || !payload?.length) return null;

  const nestLabel = payload.length === 1 && indicator !== 'dot';

  return (
    <div className={cn('grid min-w-32 items-start rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-md', className)}>
      {!nestLabel ? tooltipLabel : null}
      <div className="grid gap-1.5">
        {payload.filter(item => item.type !== 'none').map((item, index) => {
          const key = `${nameKey ?? item.name ?? item.dataKey ?? 'value'}`;
          const itemConfig = getPayloadConfigFromPayload(config, item, key);
          const indicatorColor = color ?? item.payload?.fill ?? item.color;

          return (
            <div key={index} className={cn(
              'flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-zinc-500',
              indicator === 'dot' && 'items-center',
            )}>
              {formatter && item?.value !== undefined && item.name ? (
                formatter(item.value, item.name, item, index, item.payload)
              ) : (
                <>
                  {!hideIndicator && (
                    <div
                      className={cn('shrink-0 rounded-[2px]', {
                        'h-2.5 w-2.5': indicator === 'dot',
                        'w-1': indicator === 'line',
                        'w-0 border-[1.5px] border-dashed bg-transparent': indicator === 'dashed',
                        'my-0.5': nestLabel && indicator === 'dashed',
                      })}
                      style={{ background: indicatorColor, borderColor: indicatorColor }}
                    />
                  )}
                  <div className={cn(
                    'flex flex-1 justify-between leading-none',
                    nestLabel ? 'items-end' : 'items-center',
                  )}>
                    <div className="grid gap-1.5">
                      {nestLabel ? tooltipLabel : null}
                      <span className="text-zinc-500">{itemConfig?.label ?? item.name}</span>
                    </div>
                    {item.value != null && (
                      <span className="font-mono font-medium text-zinc-900 tabular-nums">
                        {typeof item.value === 'number' ? item.value.toLocaleString() : String(item.value)}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ChartLegend = RechartsPrimitive.Legend;

function ChartLegendContent({ className, payload, nameKey, hideIcon = false, ...props }) {
  if (!payload?.length) return null;
  return (
    <div className={cn('flex flex-wrap items-center justify-center gap-4', className)} {...props}>
      {payload.map((item, index) => {
        const key = `${nameKey ?? item.dataKey ?? 'value'}`;
        const itemConfig = getPayloadConfigFromPayload({}, item, key);
        return (
          <div key={index} className="flex items-center gap-1.5 text-xs text-zinc-600">
            {!hideIcon && (
              <div
                className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                style={{ background: item.color }}
              />
            )}
            {itemConfig?.label ?? item.name ?? key}
          </div>
        );
      })}
    </div>
  );
}

function ChartStyle({ id, config }) {
  const cssVars = useMemo(() => {
    return Object.entries(config).reduce((acc, [key, val]) => {
      if (val?.color) acc.push(`--color-${key}: ${val.color};`);
      return acc;
    }, []);
  }, [config]);

  if (!cssVars.length) return null;

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `[data-chart="${id}"] {${cssVars.join('\n')}}`,
      }}
    />
  );
}

function getPayloadConfigFromPayload(config, payload, key) {
  if (typeof payload?.payload?.[key] !== 'undefined') return payload.payload[key];
  if (config?.[key]) return config[key];
  return null;
}

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, ChartStyle };
