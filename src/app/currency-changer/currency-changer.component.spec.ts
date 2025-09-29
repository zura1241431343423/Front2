import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CurrencyChangerComponent } from './currency-changer.component';

describe('CurrencyChangerComponent', () => {
  let component: CurrencyChangerComponent;
  let fixture: ComponentFixture<CurrencyChangerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CurrencyChangerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CurrencyChangerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
