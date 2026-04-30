import { Component, input, computed } from '@angular/core';

let instanceCounter = 0;

@Component({
  selector: 'app-logo',
  template: `
    <div class="logo-wrapper" [style.gap.rem]="size() >= 32 ? 0.6 : 0.45">
      <svg class="logo-mark" [attr.width]="size()" [attr.height]="size()" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient [attr.id]="gradBg()" x1="12" y1="8" x2="188" y2="192" gradientUnits="userSpaceOnUse">
            <stop offset="0%" [attr.stop-color]="variant() === 'light' ? '#f5f9ff' : '#10223a'" />
            <stop offset="100%" [attr.stop-color]="variant() === 'light' ? '#e8eef8' : '#081322'" />
          </linearGradient>
          <linearGradient [attr.id]="gradLetter()" x1="74" y1="40" x2="132" y2="160" gradientUnits="userSpaceOnUse">
            <stop offset="0%" [attr.stop-color]="variant() === 'light' ? '#0f2e52' : '#fff2c2'" />
            <stop offset="100%" [attr.stop-color]="variant() === 'light' ? '#194a81' : '#e1be63'" />
          </linearGradient>
        </defs>

        <rect x="8" y="8" width="184" height="184" rx="46" [attr.fill]="gradBgUrl()" />
        <rect x="12" y="12" width="176" height="176" rx="42" fill="none"
              [attr.stroke]="variant() === 'light' ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.08)'"
              stroke-width="1.2" />

        <!-- Stylized monogram -->
        <path d="M58 154L92 46H104L76 140L58 154Z" [attr.fill]="gradLetterUrl()" />
        <path d="M142 154L108 46H96L124 140L142 154Z" [attr.fill]="gradLetterUrl()" />
        <rect x="73" y="103" width="54" height="12" rx="4" [attr.fill]="gradLetterUrl()" />

        <!-- Financial accent -->
        <rect x="66" y="157" width="68" height="8" rx="4"
              [attr.fill]="variant() === 'light' ? '#0f2e52' : '#f1cf79'" opacity="0.2" />
      </svg>

      @if (showText()) {
        <span class="logo-text"
              [style.font-size.rem]="fontSize()"
              [style.color]="variant() === 'light' ? '#ffffff' : '#0a0a0a'">
          Amen<span class="logo-text-bold">Bank</span>
        </span>
      }
    </div>
  `,
  styles: [`
    .logo-wrapper {
      display: inline-flex;
      align-items: center;
      user-select: none;
    }
    .logo-mark {
      filter: drop-shadow(0 4px 10px rgba(0,0,0,0.12));
      transition: transform .2s ease;
    }
    .logo-wrapper:hover .logo-mark {
      transform: translateY(-1px);
    }
    .logo-text {
      font-weight: 500;
      letter-spacing: -0.03em;
      line-height: 1;
    }
    .logo-text-bold {
      font-weight: 800;
      color: #0f4a86;
    }
  `]
})
export class LogoComponent {
  size = input(28);
  variant = input<'dark' | 'light'>('dark');
  showText = input(true);

  private id = ++instanceCounter;

  gradBg = computed(() => `logoBg${this.id}`);
  gradLetter = computed(() => `logoLetter${this.id}`);
  gradBgUrl = computed(() => `url(#${this.gradBg()})`);
  gradLetterUrl = computed(() => `url(#${this.gradLetter()})`);
  fontSize = computed(() => {
    const s = this.size();
    if (s >= 38) return 1.3;
    if (s >= 32) return 1.1;
    return 0.95;
  });
}
