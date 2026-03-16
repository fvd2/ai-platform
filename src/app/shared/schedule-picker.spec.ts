import { describe, it, expect, vi } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { SchedulePickerComponent } from './schedule-picker';

describe('SchedulePickerComponent', () => {
  let fixture: ComponentFixture<SchedulePickerComponent>;
  let component: SchedulePickerComponent;

  function createComponent(schedule = '', scheduleDescription = '') {
    TestBed.configureTestingModule({ imports: [SchedulePickerComponent] });
    fixture = TestBed.createComponent(SchedulePickerComponent);
    if (schedule) {
      fixture.componentRef.setInput('schedule', schedule);
    }
    if (scheduleDescription) {
      fixture.componentRef.setInput('scheduleDescription', scheduleDescription);
    }
    fixture.detectChanges();
    component = fixture.componentInstance;
    return fixture;
  }

  it('should render all preset buttons', () => {
    createComponent();
    const buttons = fixture.nativeElement.querySelectorAll('.schedule-picker__preset');
    expect(buttons.length).toBe(component.presets.length);
  });

  it('should start with custom mode (empty selectedPreset)', () => {
    createComponent();
    expect(component.isCustom()).toBe(true);
  });

  it('should show custom input when in custom mode', () => {
    createComponent();
    const input = fixture.nativeElement.querySelector('.schedule-picker__input');
    expect(input).toBeTruthy();
  });

  it('should emit scheduleChange when a preset is selected', () => {
    createComponent();
    const spy = vi.fn();
    component.scheduleChange.subscribe(spy);
    component.onPresetSelect({ label: 'Every hour', cron: '0 * * * *' });
    expect(spy).toHaveBeenCalledWith({ schedule: '0 * * * *', description: 'Every hour' });
  });

  it('should not emit when Custom preset is selected (empty cron)', () => {
    createComponent();
    const spy = vi.fn();
    component.scheduleChange.subscribe(spy);
    component.onPresetSelect({ label: 'Custom', cron: '' });
    expect(spy).not.toHaveBeenCalled();
  });

  it('should hide custom input when a non-custom preset is selected', () => {
    createComponent();
    component.onPresetSelect({ label: 'Every hour', cron: '0 * * * *' });
    fixture.detectChanges();
    expect(component.isCustom()).toBe(false);
    const input = fixture.nativeElement.querySelector('.schedule-picker__input');
    expect(input).toBeNull();
  });

  it('should emit scheduleChange when custom cron is entered', () => {
    createComponent();
    const spy = vi.fn();
    component.scheduleChange.subscribe(spy);
    component.onCustomChange('*/5 * * * *');
    expect(spy).toHaveBeenCalledWith({
      schedule: '*/5 * * * *',
      description: 'Custom: */5 * * * *',
    });
  });

  it('should update customCron signal on custom input', () => {
    createComponent();
    component.onCustomChange('*/10 * * * *');
    expect(component.customCron()).toBe('*/10 * * * *');
  });

  it('should mark selected preset as active', () => {
    createComponent();
    component.onPresetSelect({ label: 'Every hour', cron: '0 * * * *' });
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('.schedule-picker__preset');
    const hourButton = Array.from(buttons).find(
      (b) => (b as HTMLElement).textContent?.trim() === 'Every hour',
    ) as HTMLElement;
    expect(hourButton?.classList.contains('schedule-picker__preset--active')).toBe(true);
  });
});
