import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  input,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { StreamRepository } from '../../core/repositories/stream-repository';
import { Subscription } from 'rxjs';
import { ClientType } from 'tracking-map';
import flvjs from 'flv.js';

@Component({
  selector: 'tracking-video-component',
  imports: [],
  templateUrl: './tracking-video-component.html',
  styleUrl: './tracking-video-component.css',
})
export class TrackingVideoComponent implements OnInit, OnDestroy, AfterViewInit {
  private apiRepository = inject(StreamRepository);

  private repositorySubscription?: Subscription;
  private flvPlayers = new Map<number, flvjs.Player>();
  private playersInitialized = false;

  provider = input.required<ClientType>();
  unitId = input.required<string | number>();

  @ViewChildren('videoPlayer')
  videoRefs!: QueryList<ElementRef<HTMLVideoElement>>;
  streamUrls: string[] = [];

  ngOnInit(): void {
    this.repositorySubscription = this.apiRepository
      .getStreamUrls(this.provider(), this.unitId())
      .subscribe((response) => {
        this.streamUrls.push(...response.urls);
      });
  }

  ngOnDestroy(): void {
    this.repositorySubscription?.unsubscribe();
  }

  ngAfterViewInit(): void {
    this.initPlayersIfReady();
  }

  private initPlayersIfReady(): void {
    if (!this.streamUrls.length) return;
    if (this.playersInitialized) return;

    this.playersInitialized = true;

    this.streamUrls.forEach((stream, index) => {
      this.destroyPlayer(index);
      this.createFlvPlayer(index, stream);
    });
  }

  private getVideoElement(index: number): HTMLVideoElement | null {
    return this.videoRefs?.toArray()[index]?.nativeElement ?? null;
  }

  private destroyPlayer(index: number): void {
    /*this.clearStreamRetry(index);
    this.clearStreamStartup(index);*/

    const p = this.flvPlayers.get(index);
    if (p) {
      try {
        p.pause();
      } catch (_) {}
      try {
        p.unload();
        p.detachMediaElement();
        p.destroy();
      } catch (_) {}
    }

    this.resetVideoElement(index);
    this.flvPlayers.delete(index);
  }

  private resetVideoElement(index: number): void {
    const videoEl = this.getVideoElement(index);
    if (!videoEl) return;

    try {
      videoEl.pause();
    } catch (_) {}

    videoEl.removeAttribute('src');
    videoEl.srcObject = null;
    videoEl.load();
  }

  private createFlvPlayer(index: number, url: string): void {
    if (!flvjs.isSupported()) return;

    const videoEl = this.getVideoElement(index);
    if (!videoEl) return;

    this.destroyPlayer(index);

    videoEl.muted = true;
    videoEl.autoplay = true;
    videoEl.playsInline = true;

    const player = flvjs.createPlayer(
      { type: 'flv', url, isLive: true, cors: true },
      {
        enableStashBuffer: true,
        stashInitialSize: 128 * 1024,
        lazyLoad: false,
      },
    );

    videoEl.onerror = () => {
      return null;
    };

    player.attachMediaElement(videoEl);
    player.load();

    player.play();

    player.on(flvjs.Events.ERROR, (type, detail, info) => {
      console.error('FLV ERROR', { index, type, detail, info });
    });

    this.flvPlayers.set(index, player);
  }
}
