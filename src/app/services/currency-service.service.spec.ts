import { TestBed } from '@angular/core/testing';

import { CurrencyServiceService } from './currency-service.service';

describe('CurrencyServiceService', () => {
  let service: CurrencyServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CurrencyServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
