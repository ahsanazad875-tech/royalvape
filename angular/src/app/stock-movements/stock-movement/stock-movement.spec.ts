import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StockMovement } from './stock-movement';

describe('StockMovement', () => {
  let component: StockMovement;
  let fixture: ComponentFixture<StockMovement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockMovement]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StockMovement);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
