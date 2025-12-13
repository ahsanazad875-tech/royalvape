import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhysicalInventory } from './physical-inventory';

describe('PhysicalInventory', () => {
  let component: PhysicalInventory;
  let fixture: ComponentFixture<PhysicalInventory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhysicalInventory]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PhysicalInventory);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
