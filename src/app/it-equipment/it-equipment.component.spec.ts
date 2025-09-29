import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardComponent } from '../card/card.component';
import { ItEquipmentComponent } from './it-equipment.component';

describe('ItEquipmentComponent', () => {
  let component: ItEquipmentComponent;
  let fixture: ComponentFixture<ItEquipmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItEquipmentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ItEquipmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
