import { Chip } from "@/components/atoms/Chip";
import { Label } from "@/components/atoms/Label";
import { GlassInner } from "@/components/molecules/GlassInner";

type VolatilityChartProps = {
  upperStrike: string;
  lowerStrike: string;
  refPrice: string;
  className?: string;
};

export function VolatilityChart({
  upperStrike,
  lowerStrike,
  refPrice,
  className = "",
}: VolatilityChartProps) {
  return (
    <div className={`glass p-6 ${className}`}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Label>BTC volatility</Label>
          <h3 className="font-display text-lg text-white mt-1">Range band</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <Chip>24H</Chip>
          <Chip highlight>7D</Chip>
          <Chip>30D</Chip>
        </div>
      </div>

      <div
        className="mt-5 relative aspect-[16/10] rounded-2xl overflow-hidden border border-white/10"
        style={{
          background:
            "radial-gradient(120% 60% at 50% 110%, rgba(46,107,255,.3), transparent 60%), linear-gradient(180deg, rgba(15,26,56,0), rgba(15,26,56,.55))",
        }}
      >
        <svg viewBox="0 0 600 380" className="absolute inset-0 w-full h-full">
          <defs>
            <linearGradient id="bf2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#5EE8FF" stopOpacity=".16" />
              <stop offset="1" stopColor="#5EE8FF" stopOpacity=".02" />
            </linearGradient>
            <linearGradient id="pl2" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#6CF2C2" />
              <stop offset=".6" stopColor="#5EE8FF" />
              <stop offset="1" stopColor="#6E5BFF" />
            </linearGradient>
          </defs>
          <g stroke="rgba(255,255,255,0.05)">
            <path d="M0 60 H600" />
            <path d="M0 130 H600" />
            <path d="M0 200 H600" />
            <path d="M0 270 H600" />
            <path d="M0 340 H600" />
            <path d="M120 0 V380" />
            <path d="M240 0 V380" />
            <path d="M360 0 V380" />
            <path d="M480 0 V380" />
          </g>
          <rect x="0" y="140" width="600" height="120" fill="url(#bf2)" />
          <line x1="0" y1="140" x2="600" y2="140" stroke="#5EE8FF" strokeOpacity=".5" strokeDasharray="4 6" />
          <line x1="0" y1="260" x2="600" y2="260" stroke="#5EE8FF" strokeOpacity=".5" strokeDasharray="4 6" />
          <text x="14" y="134" fontFamily="JetBrains Mono" fontSize="10" fill="#9FB1CC">UPPER {upperStrike}</text>
          <text x="14" y="276" fontFamily="JetBrains Mono" fontSize="10" fill="#9FB1CC">LOWER {lowerStrike}</text>
          <text x="14" y="200" fontFamily="JetBrains Mono" fontSize="10" fill="#5EE8FF">REF {refPrice}</text>
          <path
            d="M0,230 C60,225 100,220 140,215 S220,200 260,180 S330,150 360,140 S420,100 470,80 S540,50 600,40"
            fill="none"
            stroke="url(#pl2)"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="price-path"
          />
          <circle cx="335" cy="140" r="16" fill="#5EE8FF" fillOpacity=".25" />
          <circle cx="335" cy="140" r="3.5" fill="#5EE8FF" />
          <line x1="540" y1="0" x2="540" y2="380" stroke="#fff" strokeOpacity=".15" strokeDasharray="2 4" />
          <text x="546" y="20" fontFamily="JetBrains Mono" fontSize="10" fill="#9FB1CC">NOW</text>
        </svg>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <GlassInner>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-sm bg-seafoam-400" />
            <Label>MOVE wins</Label>
          </div>
          <div className="mt-2 font-display text-xl text-white">If spot exits range</div>
          <div className="text-xs text-ink-mid mt-1">Breach above {upperStrike} or below {lowerStrike}</div>
        </GlassInner>
        <GlassInner>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-sm bg-iris-500" />
            <Label>RANGE wins</Label>
          </div>
          <div className="mt-2 font-display text-xl text-white">If spot stays inside</div>
          <div className="text-xs text-ink-mid mt-1">Price settles between {lowerStrike} and {upperStrike}</div>
        </GlassInner>
      </div>
    </div>
  );
}
