import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, NgZone, OnDestroy } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ButtonDelayService implements OnDestroy {
  private readonly delayMs = 50;
  private readonly readyAttr = 'data-amen-delay-ready';
  private readonly pending = new WeakMap<HTMLElement, number>();
  private readonly clickListener = (event: MouseEvent) => this.delayButtonClick(event);

  constructor(@Inject(DOCUMENT) private document: Document, private zone: NgZone) {
    this.zone.runOutsideAngular(() => {
      this.document.addEventListener('click', this.clickListener, true);
    });
  }

  ngOnDestroy(): void {
    this.document.removeEventListener('click', this.clickListener, true);
  }

  private delayButtonClick(event: MouseEvent): void {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) return;

    const control = target.closest('button, a.btn, a.btn-nav, a.nav-item') as HTMLElement | null;
    if (!control || !this.document.contains(control) || this.isDisabled(control)) return;

    if (control.getAttribute(this.readyAttr) === 'true') {
      control.removeAttribute(this.readyAttr);
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (this.pending.has(control)) return;

    control.classList.add('is-delaying-click');
    const timer = window.setTimeout(() => {
      this.pending.delete(control);
      control.classList.remove('is-delaying-click');
      if (!this.document.contains(control) || this.isDisabled(control)) return;
      control.setAttribute(this.readyAttr, 'true');
      control.click();
    }, this.delayMs);

    this.pending.set(control, timer);
  }

  private isDisabled(control: HTMLElement): boolean {
    return control.hasAttribute('disabled') || control.getAttribute('aria-disabled') === 'true';
  }
}
