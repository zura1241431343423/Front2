import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecommendationProductsComponent } from './recommendation-products.component';

describe('RecommendationProductsComponent', () => {
  let component: RecommendationProductsComponent;
  let fixture: ComponentFixture<RecommendationProductsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecommendationProductsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecommendationProductsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
