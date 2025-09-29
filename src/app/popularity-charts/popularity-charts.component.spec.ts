import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PopularityChartsComponent } from './popularity-charts.component';

describe('PopularityChartsComponent', () => {
  let component: PopularityChartsComponent;
  let fixture: ComponentFixture<PopularityChartsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PopularityChartsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PopularityChartsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
