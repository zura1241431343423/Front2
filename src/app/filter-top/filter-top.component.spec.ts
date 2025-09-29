import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilterTopComponent } from './filter-top.component';

describe('FilterTopComponent', () => {
  let component: FilterTopComponent;
  let fixture: ComponentFixture<FilterTopComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterTopComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FilterTopComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
