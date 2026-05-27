import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrackingVideoComponent } from './tracking-video-component';

describe('TrackingVideoComponent', () => {
  let component: TrackingVideoComponent;
  let fixture: ComponentFixture<TrackingVideoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrackingVideoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TrackingVideoComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
