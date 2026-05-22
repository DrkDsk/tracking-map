import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LiveMapComponent } from './live-map-component';

describe('LiveMapComponent', () => {
  let component: LiveMapComponent;
  let fixture: ComponentFixture<LiveMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LiveMapComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LiveMapComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
