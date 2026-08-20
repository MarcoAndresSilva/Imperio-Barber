import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-info',
  templateUrl: './info.html',
  styleUrl: './info.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Info {}
