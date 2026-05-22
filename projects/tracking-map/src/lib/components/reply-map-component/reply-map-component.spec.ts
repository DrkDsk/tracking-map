import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReplyMapComponent } from './reply-map-component';

describe('ReplyMapComponent', () => {
  let component: ReplyMapComponent;
  let fixture: ComponentFixture<ReplyMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReplyMapComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ReplyMapComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
