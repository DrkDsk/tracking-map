import { Component, inject, input, OnDestroy, OnInit } from '@angular/core';
import { StreamRepository } from '../../core/repositories/stream-repository';
import { Subscription } from 'rxjs';
import { ClientType } from 'tracking-map';

@Component({
  selector: 'tracking-video-component',
  imports: [],
  templateUrl: './tracking-video-component.html',
  styleUrl: './tracking-video-component.css',
})
export class TrackingVideoComponent implements OnInit, OnDestroy {
  private apiRepository = inject(StreamRepository);

  private repositorySubscription?: Subscription;

  provider = input.required<ClientType>();
  unitId = input.required<string | number>();

  ngOnInit(): void {
    this.repositorySubscription = this.apiRepository
      .getStreamUrls(this.provider(), this.unitId())
      .subscribe((response) => console.log(response));
  }

  ngOnDestroy(): void {
    this.repositorySubscription?.unsubscribe();
  }
}
