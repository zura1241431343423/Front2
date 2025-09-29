import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewlyAddedProductsComponent } from './newly-added-products.component';

describe('NewlyAddedProductsComponent', () => {
  let component: NewlyAddedProductsComponent;
  let fixture: ComponentFixture<NewlyAddedProductsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewlyAddedProductsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewlyAddedProductsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
