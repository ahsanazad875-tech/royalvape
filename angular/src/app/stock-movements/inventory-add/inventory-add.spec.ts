import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InventoryAdd } from './inventory-add';

describe('InventoryAdd', () => {
  let component: InventoryAdd;
  let fixture: ComponentFixture<InventoryAdd>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryAdd]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InventoryAdd);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
