import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { DynamicBlockComponent } from './dynamic-block';
import { DynamicBlock } from '../../core/models/dynamic-block.model';

@Component({
  imports: [DynamicBlockComponent],
  template: `<app-dynamic-block [block]="block()" />`,
})
class TestHostComponent {
  block = signal<DynamicBlock>({
    type: 'key-value',
    data: { pairs: [{ key: 'Name', value: 'Test' }] },
  });
}

describe('DynamicBlockComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.nativeElement.querySelector('app-dynamic-block')).toBeTruthy();
  });

  it('should render key-value block', () => {
    expect(fixture.nativeElement.querySelector('app-key-value-block')).toBeTruthy();
  });

  it('should render chart block', () => {
    host.block.set({
      type: 'chart',
      data: {
        type: 'bar',
        labels: ['A', 'B'],
        datasets: [{ label: 'Sales', data: [10, 20] }],
      },
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-chart-block')).toBeTruthy();
  });

  it('should render data-table block', () => {
    host.block.set({
      type: 'data-table',
      data: {
        columns: [{ key: 'name', label: 'Name' }],
        rows: [{ name: 'Alice' }],
      },
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-data-table-block')).toBeTruthy();
  });

  it('should render dynamic-block__title when title is provided', () => {
    host.block.set({
      type: 'key-value',
      title: 'My Title',
      data: { pairs: [{ key: 'K', value: 'V' }] },
    });
    fixture.detectChanges();
    const titleEl = fixture.nativeElement.querySelector('.dynamic-block__title');
    expect(titleEl).toBeTruthy();
    expect(titleEl.textContent.trim()).toBe('My Title');
  });

  it('should render fallback pre for unrecognized block type', () => {
    host.block.set({
      type: 'code',
      data: { content: 'test' },
    });
    fixture.detectChanges();
    // 'code' is not handled by @switch cases, so it falls through to @default
    const fallback = fixture.nativeElement.querySelector('pre');
    expect(fallback).toBeTruthy();
  });
});
