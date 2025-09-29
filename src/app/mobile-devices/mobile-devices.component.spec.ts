import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MobileDevicesComponent } from './mobile-devices.component';

describe('MobileDevicesComponent', () => {
  let component: MobileDevicesComponent;
  let fixture: ComponentFixture<MobileDevicesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileDevicesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MobileDevicesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
