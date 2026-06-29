import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TextFieldModule } from '@angular/cdk/text-field';
import { forkJoin } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { environment } from '@env/environment';
import { PropertyConfigService, PropertyConfig, KeyBox } from '../../core/services/property-config.service';
import { BookingService } from '../../core/services/booking.service';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { PropertyInventoryService, InventoryItem, INVENTORY_CATEGORIES, QUICK_ITEMS } from '../../core/services/property-inventory.service';
import { PropertyBundleService, PropertyBundle } from '../../core/services/property-bundle.service';
import { localDateStr } from '../../core/utils/date.utils';

interface OccupancyStatus {
  type: 'urgent' | 'vacant_long' | 'vacant_short' | 'occupied';
  label: string;
  sublabel?: string;
  color: string;
  bg: string;
  icon: string;
  sortKey: string;
  tips: string[];
}

@Component({
  selector: 'app-properties',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TextFieldModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatProgressSpinnerModule,
    MatTooltipModule, MatSnackBarModule, MatDividerModule, MatSlideToggleModule,
    TranslateModule
  ],
  template: `
    <!-- Formulaire ajout logement (mode iCal) -->
    @if (isIcalMode()) {
      <div class="ical-add-section">
        @if (addPropOpen()) {
          <mat-card class="add-prop-card">
            <mat-card-content>
              <div class="add-prop-form">
                <mat-form-field appearance="outline" class="add-field-name">
                  <mat-label>{{ 'properties.local_prop_name' | translate }}</mat-label>
                  <input matInput [(ngModel)]="addPropForm.name" autocomplete="off">
                </mat-form-field>
                <mat-form-field appearance="outline" class="add-field-short">
                  <mat-label>{{ 'properties.short_name' | translate }}</mat-label>
                  <input matInput [(ngModel)]="addPropForm.shortName" autocomplete="off">
                </mat-form-field>
                <div class="add-prop-actions">
                  <button mat-flat-button color="primary" (click)="addLocalProp()" [disabled]="addPropSaving() || !addPropForm.name.trim()">
                    @if (addPropSaving()) { <mat-spinner diameter="18"></mat-spinner> } @else { {{ 'common.save' | translate }} }
                  </button>
                  <button mat-button (click)="addPropOpen.set(false)">{{ 'common.cancel' | translate }}</button>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        } @else {
          <button mat-flat-button color="primary" (click)="openAddProp()">
            <mat-icon>add</mat-icon> {{ 'properties.add_local_prop' | translate }}
          </button>
        }
      </div>
    }

    <div class="page-header">
      <h1>{{ 'properties.title' | translate }}</h1>
      <mat-form-field appearance="outline" class="search-field">
        <mat-label>{{ 'properties.search' | translate }}</mat-label>
        <input matInput [(ngModel)]="searchDraft" placeholder="Nom, ville…"
               autocomplete="off" (keydown.enter)="applySearch()">
        @if (search()) {
          <button mat-icon-button matSuffix (click)="clearSearch()" [matTooltip]="'common.clear' | translate">
            <mat-icon>close</mat-icon>
          </button>
        } @else {
          <button mat-icon-button matSuffix (click)="applySearch()" [matTooltip]="'common.search' | translate">
            <mat-icon>search</mat-icon>
          </button>
        }
      </mat-form-field>
    </div>

    @if (!loading() && properties().length > 0 && !isIcalMode()) {
      <mat-card class="bundle-card">
        <mat-card-header>
          <mat-card-title>{{ 'properties.bundle_title' | translate }}</mat-card-title>
          <mat-card-subtitle>{{ 'properties.bundle_subtitle' | translate }}</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          @if (bundles().length === 0 && !bundleFormOpen()) {
            <p class="bundle-empty">{{ 'properties.bundle_no_bundles' | translate }}</p>
          }
          @for (b of bundles(); track b.id) {
            <div class="bundle-row">
              <div class="bundle-info">
                <strong>{{ b.name }}</strong>
                <span class="bundle-sub">{{ 'properties.bundle_unit' | translate }} : {{ propertyLabel(b.bundlePropertyId) }}</span>
                <span class="bundle-sub">{{ 'properties.bundle_members' | translate }} : {{ memberLabels(b) }}</span>
                @if (b.lastRunAt) {
                  <span class="bundle-sub">{{ 'properties.bundle_last_run' | translate }} {{ b.lastRunAt | date:'dd/MM/yyyy HH:mm' }} — {{ b.lastRunStatus }}</span>
                }
              </div>
              <div class="bundle-actions">
                <mat-slide-toggle [checked]="b.enabled" (change)="toggleBundleEnabled(b)"
                  [matTooltip]="'properties.bundle_enabled' | translate"></mat-slide-toggle>
                <button mat-icon-button (click)="runBundleNow(b)" [disabled]="runningBundleId() === b.id"
                  [matTooltip]="'properties.bundle_run_now' | translate">
                  @if (runningBundleId() === b.id) { <mat-spinner diameter="18"></mat-spinner> } @else { <mat-icon>sync</mat-icon> }
                </button>
                <button mat-icon-button (click)="editBundle(b)" [matTooltip]="'common.edit' | translate">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button (click)="deleteBundle(b)" [matTooltip]="'common.delete' | translate">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </div>
            <mat-divider></mat-divider>
          }

          @if (bundleFormOpen()) {
            <div class="bundle-form">
              <mat-form-field appearance="outline">
                <mat-label>{{ 'properties.bundle_name' | translate }}</mat-label>
                <input matInput [(ngModel)]="bundleForm.name" [placeholder]="'properties.bundle_name_placeholder' | translate">
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>{{ 'properties.bundle_select_unit' | translate }}</mat-label>
                <mat-select [(ngModel)]="bundleForm.bundlePropertyId">
                  @for (p of properties(); track p['id']) {
                    <mat-option [value]="idOf(p)">{{ displayName(p) }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>{{ 'properties.bundle_select_members' | translate }}</mat-label>
                <mat-select multiple [(ngModel)]="bundleForm.memberPropertyIds">
                  @for (p of properties(); track p['id']) {
                    <mat-option [value]="idOf(p)">{{ displayName(p) }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="bundle-horizon-field">
                <mat-label>{{ 'properties.bundle_horizon' | translate }}</mat-label>
                <input matInput type="number" min="1" [(ngModel)]="bundleForm.horizonDays">
              </mat-form-field>

              <mat-slide-toggle [(ngModel)]="bundleForm.enabled">{{ 'properties.bundle_enabled' | translate }}</mat-slide-toggle>

              <div class="bundle-form-actions">
                <button mat-flat-button color="primary" (click)="saveBundle()" [disabled]="savingBundle()">
                  @if (savingBundle()) { <mat-spinner diameter="18"></mat-spinner> } @else { {{ 'properties.bundle_save' | translate }} }
                </button>
                <button mat-button (click)="cancelBundleForm()">{{ 'common.cancel' | translate }}</button>
              </div>
            </div>
          } @else {
            <button mat-stroked-button (click)="openNewBundleForm()">
              <mat-icon>add</mat-icon> {{ 'properties.bundle_add' | translate }}
            </button>
          }
        </mat-card-content>
      </mat-card>
    }

    @if (loading()) {
      <div class="center"><mat-spinner diameter="48"></mat-spinner></div>
    } @else if (filtered().length === 0) {
      <div class="empty">
        <mat-icon>home_work</mat-icon>
        <p>{{ 'properties.no_properties' | translate }}</p>
      </div>
    } @else {
      <p class="count">{{ filtered().length }} logement{{ filtered().length !== 1 ? 's' : '' }}</p>
      <div class="props-grid">
        @for (p of filtered(); track p['id']) {
          <mat-card class="prop-card">
            <mat-card-header>
              <div class="prop-avatar" mat-card-avatar>
                <mat-icon>home</mat-icon>
              </div>
              <mat-card-title>
                {{ displayName(p) || '—' }}
                @if (shortNameSaved[p['id']]) {
                  <span class="short-name-badge">{{ p['name'] }}</span>
                }
              </mat-card-title>
              <mat-card-subtitle class="sub">
                @if (p['city']) {
                  <mat-icon class="sub-icon">location_on</mat-icon>{{ p['city'] }}
                  @if (p['country']) { &nbsp;· {{ p['country'] }} }
                }
              </mat-card-subtitle>
            </mat-card-header>

            @if (occupancyMap()[p['id']]; as occ) {
              <div class="occ-banner" [style.background]="occ.bg" [style.color]="occ.color"
                   (click)="toggleTip(p['id'])" role="button" style="cursor:pointer">
                <mat-icon class="occ-icon">{{ occ.icon }}</mat-icon>
                <span class="occ-label">{{ occ.label }}</span>
                @if (occ.sublabel) { <span class="occ-sub">· {{ occ.sublabel }}</span> }
                <mat-icon class="occ-arrow">{{ tipsOpen[p['id']] ? 'expand_less' : 'lightbulb' }}</mat-icon>
              </div>
              @if (tipsOpen[p['id']]) {
                <div class="occ-tips" [style.border-left-color]="occ.color">
                  @for (tip of occ.tips; track $index) {
                    <div class="tip-row">
                      <mat-icon class="tip-bullet">chevron_right</mat-icon>
                      <span>{{ tip }}</span>
                    </div>
                  }
                </div>
              }
            }

            <mat-card-content>
              @if (!isIcalMode()) {
                <div class="info-rows">
                  @if (p['address']) {
                    <div class="info-row">
                      <mat-icon>place</mat-icon>
                      <span>{{ p['address'] }}</span>
                    </div>
                  }
                  @if (roomCount(p)) {
                    <div class="info-row">
                      <mat-icon>bed</mat-icon>
                      <span>{{ roomCount(p) }} {{ 'properties.beds' | translate }}</span>
                    </div>
                  }
                  @if (p['maxGuests'] || p['maxPeople']) {
                    <div class="info-row">
                      <mat-icon>group</mat-icon>
                      <span>{{ p['maxGuests'] || p['maxPeople'] }} {{ 'public.max_guests' | translate }}</span>
                    </div>
                  }
                  <div class="info-row">
                    <mat-icon>tag</mat-icon>
                    <span class="prop-id">ID Beds24 : {{ p['id'] }}</span>
                  </div>
                </div>
              }
              @if (isIcalMode() && icalEditDraft[p['id']]; as draft) {
                <div class="ical-edit-section">
                  <div class="ical-fields-row">
                    <mat-form-field appearance="outline" class="ical-name-field">
                      <mat-label>{{ 'properties.local_prop_name' | translate }}</mat-label>
                      <input matInput [(ngModel)]="draft.name" autocomplete="off">
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="ical-short-field">
                      <mat-label>{{ 'properties.short_name' | translate }}</mat-label>
                      <input matInput [(ngModel)]="draft.shortName" autocomplete="off">
                    </mat-form-field>
                  </div>
                  <div class="ical-prop-actions">
                    <button mat-flat-button color="primary" (click)="saveLocalProp(p['id'])"
                            [disabled]="!isLocalPropDirty(p['id'])">
                      <mat-icon>save</mat-icon> {{ 'common.save' | translate }}
                    </button>
                    <button mat-icon-button color="warn" (click)="deleteLocalProp(p['id'])"
                            [matTooltip]="'common.delete' | translate">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>

                  <!-- Sources iCal (plateformes importées) -->
                  <div class="ical-sources-section">
                    <div class="ical-sources-header">
                      <mat-icon class="src-icon">link</mat-icon>
                      <strong>{{ 'properties.ical_sources_title' | translate }}</strong>
                    </div>
                    @for (src of icalSources[p['id']] ?? []; track src.id) {
                      @if (icalSourceEditId[p['id']] === src.id && icalSourceEditDraft[p['id']]?.[src.id]; as editDraft) {
                        <div class="source-edit-row">
                          <mat-form-field appearance="outline" class="src-name-field">
                            <mat-label>{{ 'properties.ical_source_name' | translate }}</mat-label>
                            <input matInput [(ngModel)]="editDraft.name" autocomplete="off">
                          </mat-form-field>
                          <mat-form-field appearance="outline" class="src-url-field">
                            <mat-label>URL</mat-label>
                            <input matInput [(ngModel)]="editDraft.url" autocomplete="off">
                          </mat-form-field>
                          <button mat-icon-button color="primary" (click)="updateSource(p['id'], src.id)"
                                  [matTooltip]="'common.save' | translate">
                            <mat-icon>check</mat-icon>
                          </button>
                          <button mat-icon-button (click)="cancelEditSource(p['id'])"
                                  [matTooltip]="'common.cancel' | translate">
                            <mat-icon>close</mat-icon>
                          </button>
                        </div>
                      } @else {
                        <div class="source-row">
                          <div class="source-info">
                            <span class="source-name">{{ src.name }}</span>
                            <span class="source-meta">
                              @if (src.lastSync) { {{ 'properties.ical_source_last_sync' | translate }} {{ src.lastSync | date:'dd/MM HH:mm' }}
                                @if (src.lastSyncCount != null) { · {{ src.lastSyncCount }} évén. }
                              }
                            </span>
                          </div>
                          <div class="source-actions">
                            <button mat-icon-button (click)="syncSource(p['id'], src.id)"
                                    [disabled]="isSourceSyncing(p['id'], src.id)"
                                    [matTooltip]="'properties.local_prop_sync' | translate">
                              @if (isSourceSyncing(p['id'], src.id)) { <mat-spinner diameter="16"></mat-spinner> }
                              @else { <mat-icon>sync</mat-icon> }
                            </button>
                            <button mat-icon-button (click)="startEditSource(p['id'], src)"
                                    [matTooltip]="'common.edit' | translate">
                              <mat-icon>edit</mat-icon>
                            </button>
                            <button mat-icon-button color="warn" (click)="deleteSource(p['id'], src.id)"
                                    [matTooltip]="'common.delete' | translate">
                              <mat-icon>delete</mat-icon>
                            </button>
                          </div>
                        </div>
                      }
                    }
                    @if (icalSourceFormOpen[p['id']]) {
                      <div class="source-add-row">
                        <mat-form-field appearance="outline" class="src-name-field">
                          <mat-label>{{ 'properties.ical_source_name' | translate }}</mat-label>
                          <input matInput [(ngModel)]="icalSourceForm[p['id']].name" autocomplete="off"
                                 placeholder="Airbnb, Booking…">
                        </mat-form-field>
                        <mat-form-field appearance="outline" class="src-url-field">
                          <mat-label>URL iCal</mat-label>
                          <input matInput [(ngModel)]="icalSourceForm[p['id']].url" autocomplete="off"
                                 placeholder="https://…">
                        </mat-form-field>
                        <button mat-icon-button color="primary"
                                (click)="addSource(p['id'])"
                                [disabled]="icalSourceSaving[p['id']] || !icalSourceForm[p['id']]?.name?.trim() || !icalSourceForm[p['id']]?.url?.trim()"
                                [matTooltip]="'common.save' | translate">
                          @if (icalSourceSaving[p['id']]) { <mat-spinner diameter="16"></mat-spinner> }
                          @else { <mat-icon>check</mat-icon> }
                        </button>
                        <button mat-icon-button (click)="icalSourceFormOpen[p['id']] = false"
                                [matTooltip]="'common.cancel' | translate">
                          <mat-icon>close</mat-icon>
                        </button>
                      </div>
                    } @else {
                      <button mat-stroked-button class="add-source-btn" (click)="openSourceForm(p['id'])">
                        <mat-icon>add</mat-icon> {{ 'properties.ical_source_add' | translate }}
                      </button>
                    }
                  </div>

                  @if (p['icalFeedToken']) {
                    <div class="ical-export-row">
                      <mat-icon class="ical-export-icon">rss_feed</mat-icon>
                      <div class="ical-export-info">
                        <span class="ical-export-label">{{ 'properties.ical_export_label' | translate }}</span>
                        <code class="ical-export-url">{{ icalExportUrl(p['icalFeedToken']) }}</code>
                      </div>
                      <button mat-icon-button (click)="copyIcalFeedUrl(p['icalFeedToken'])"
                              [matTooltip]="'common.copy' | translate">
                        <mat-icon>content_copy</mat-icon>
                      </button>
                    </div>
                  }
                </div>
              }

              <mat-divider class="divider"></mat-divider>

              <!-- Nom court (Beds24 uniquement — pour iCal le shortName est dans le formulaire d'édition) -->
              @if (!isIcalMode()) {
                <div class="code-section">
                  <div class="code-label">
                    <mat-icon [matTooltip]="'properties.short_name_hint' | translate">label</mat-icon>
                    <strong>{{ 'properties.short_name' | translate }}</strong>
                    @if (isShortNameDirty(p['id'])) {
                      <button mat-flat-button color="primary" class="save-btn"
                              (click)="saveShortName(p['id'])">
                        <mat-icon>save</mat-icon> {{ 'common.save' | translate }}
                      </button>
                    }
                  </div>
                  <mat-form-field appearance="outline" class="code-field">
                    <input matInput [(ngModel)]="shortNameDraft[p['id']]"
                           placeholder="Ex : Appt Centre-Ville, Studio Mer…"
                           (ngModelChange)="shortNameDraft[p['id']] = $event">
                  </mat-form-field>
                </div>
              }

              <mat-divider class="divider"></mat-divider>

              <!-- Code d'accès -->
              <div class="code-section">
                <div class="code-label">
                  <mat-icon>vpn_key</mat-icon>
                  <strong>{{ 'properties.access_code_box' | translate }}</strong>
                  @if (isDirty(p['id'])) {
                    <span class="unsaved-dot" [matTooltip]="'common.unsaved_changes' | translate"></span>
                  }
                </div>

                <!-- Badge boîte à clef active -->
                @if (propKeyBoxId[p['id']]) {
                  <div class="keybox-badge">
                    <mat-icon>lock</mat-icon>
                    <span class="keybox-badge-name">{{ propKeyBoxName[p['id']] }}</span>
                    @if (keyBoxSharedCount(p['id']) > 1) {
                      <span class="keybox-shared">· {{ 'properties.key_box_shared' | translate:{count: keyBoxSharedCount(p['id'])} }}</span>
                    }
                    <button type="button" mat-icon-button color="warn" (click)="unlinkKeyBox(p['id'])"
                            [matTooltip]="'properties.unlink_key_box' | translate" style="margin-left:auto">
                      <mat-icon>link_off</mat-icon>
                    </button>
                  </div>
                }

                <!-- Input code (local ou boîte — backend gère de façon transparente) -->
                @if (!showKeyBoxCreate[p['id']]) {
                  <div class="code-row">
                    <mat-form-field appearance="outline" class="code-input">
                      <input matInput
                             type="text"
                             [class.code-masked]="!codeVisible[p['id']]"
                             [(ngModel)]="codeDraft[p['id']]"
                             autocomplete="off"
                             [placeholder]="'common.none' | translate"
                             maxlength="20"
                             (keydown.enter)="$event.preventDefault()">
                      <button type="button" mat-icon-button matSuffix (click)="toggleVisible(p['id'])"
                              [matTooltip]="(codeVisible[p['id']] ? 'common.hide' : 'common.show') | translate">
                        <mat-icon>{{ codeVisible[p['id']] ? 'visibility_off' : 'visibility' }}</mat-icon>
                      </button>
                    </mat-form-field>
                    <button type="button" mat-icon-button color="primary" (click)="saveCode(p['id'])"
                            [matTooltip]="'properties.save_config' | translate"
                            [disabled]="!isDirty(p['id'])">
                      <mat-icon>save</mat-icon>
                    </button>
                    <button type="button" mat-icon-button (click)="regenerateCode(p['id'])"
                            [matTooltip]="'properties.regenerate_code' | translate">
                      <mat-icon>casino</mat-icon>
                    </button>
                  </div>
                  @if (prevCodes[p['id']]) {
                    <div class="prev-code">
                      <mat-icon>history</mat-icon> {{ 'properties.prev_code' | translate }} : {{ prevCodes[p['id']] }}
                    </div>
                  }
                }

                <!-- Lier à une boîte existante / créer (si pas déjà liée) -->
                @if (!propKeyBoxId[p['id']]) {
                  <div class="keybox-link-row">
                    @if (keyBoxes().length) {
                      <mat-form-field appearance="outline" class="keybox-select">
                        <mat-label>{{ 'properties.link_key_box' | translate }}</mat-label>
                        <mat-select (selectionChange)="linkKeyBox(p['id'], $event.value)">
                          @for (kb of keyBoxes(); track kb.id) {
                            <mat-option [value]="kb.id">{{ kb.name }}</mat-option>
                          }
                        </mat-select>
                      </mat-form-field>
                    }
                    <button type="button" mat-stroked-button (click)="openCreateKeyBox(p['id'])">
                      <mat-icon>add</mat-icon> {{ 'properties.create_key_box' | translate }}
                    </button>
                  </div>
                }

                <!-- Formulaire création boîte -->
                @if (showKeyBoxCreate[p['id']]) {
                  <div class="keybox-create-form">
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>{{ 'properties.key_box_name' | translate }}</mat-label>
                      <input matInput [(ngModel)]="newKeyBoxNameDraft[p['id']]" autocomplete="off">
                    </mat-form-field>
                    <div class="keybox-create-actions">
                      <button type="button" mat-flat-button color="primary"
                              (click)="createAndLinkKeyBox(p['id'])"
                              [disabled]="!newKeyBoxNameDraft[p['id']]?.trim()">
                        {{ 'common.create' | translate }}
                      </button>
                      <button type="button" mat-button (click)="showKeyBoxCreate[p['id']] = false">
                        {{ 'common.cancel' | translate }}
                      </button>
                    </div>
                  </div>
                }
              </div>

              <mat-divider class="divider"></mat-divider>

              <!-- Durée ménage standard -->
              <div class="cleaning-section">
                <div class="cleaning-label">
                  <mat-icon>cleaning_services</mat-icon>
                  <strong>{{ 'properties.cleaning_duration' | translate }}</strong>
                  @if (isCleaningDirty(p['id'])) {
                    <span class="unsaved-dot" [matTooltip]="'common.unsaved_changes' | translate"></span>
                  }
                </div>
                <div class="cleaning-row">
                  <mat-form-field appearance="outline" class="cleaning-input">
                    <input matInput type="number" min="0" step="0.5"
                           [(ngModel)]="cleaningDraft[p['id']]"
                           placeholder="Ex : 3"
                           (keydown.enter)="saveCleaning(p['id'])">
                    <span matTextSuffix>h</span>
                  </mat-form-field>
                  <button type="button" mat-icon-button color="primary"
                          (click)="saveCleaning(p['id'])"
                          [matTooltip]="'properties.cleaning_saved' | translate"
                          [disabled]="!isCleaningDirty(p['id'])">
                    <mat-icon>save</mat-icon>
                  </button>
                </div>
              </div>
              <mat-divider class="divider"></mat-divider>

              <!-- Tarification directe -->
              <div class="cleaning-section">
                <div class="cleaning-label">
                  <mat-icon>euro</mat-icon>
                  <strong>{{ 'properties.pricing_label' | translate }}</strong>
                  @if (isPricingDirty(p['id'])) {
                    <span class="unsaved-dot" [matTooltip]="'common.unsaved_changes' | translate"></span>
                  }
                </div>
                <div class="pricing-grid">
                  <mat-form-field appearance="outline" class="cleaning-input">
                    <mat-label>{{ 'properties.cleaning_fee' | translate }}</mat-label>
                    <input matInput type="number" min="0" step="1"
                           [value]="pricingDraft[p['id']]?.cleaningFee || ''"
                           (input)="setPricingField(p['id'], 'cleaningFee', $any($event.target).value)">
                    <span matTextSuffix>€</span>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="cleaning-input">
                    <mat-label>{{ 'properties.extra_person_threshold' | translate }}</mat-label>
                    <input matInput type="number" min="1" step="1"
                           [value]="pricingDraft[p['id']]?.extraPersonThreshold || ''"
                           (input)="setPricingField(p['id'], 'extraPersonThreshold', $any($event.target).value)">
                    <span matTextSuffix>pers.</span>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="cleaning-input">
                    <mat-label>{{ 'properties.extra_person_fee' | translate }}</mat-label>
                    <input matInput type="number" min="0" step="1"
                           [value]="pricingDraft[p['id']]?.extraPersonFee || ''"
                           (input)="setPricingField(p['id'], 'extraPersonFee', $any($event.target).value)">
                    <span matTextSuffix>€/nuit</span>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="cleaning-input">
                    <mat-label>{{ 'properties.discount_7' | translate }}</mat-label>
                    <input matInput type="number" min="0" max="100" step="1"
                           [value]="pricingDraft[p['id']]?.discount7Nights || ''"
                           (input)="setPricingField(p['id'], 'discount7Nights', $any($event.target).value)">
                    <span matTextSuffix>%</span>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="cleaning-input">
                    <mat-label>{{ 'properties.discount_28' | translate }}</mat-label>
                    <input matInput type="number" min="0" max="100" step="1"
                           [value]="pricingDraft[p['id']]?.discount28Nights || ''"
                           (input)="setPricingField(p['id'], 'discount28Nights', $any($event.target).value)">
                    <span matTextSuffix>%</span>
                  </mat-form-field>
                  <button type="button" mat-icon-button color="primary"
                          (click)="savePricing(p['id'])"
                          [matTooltip]="'common.save' | translate"
                          [disabled]="!isPricingDirty(p['id'])">
                    <mat-icon>save</mat-icon>
                  </button>
                </div>
              </div>
              <mat-divider class="divider"></mat-divider>

              <!-- Lien réservation Beds24 (masqué en mode iCal) -->
              @if (!isIcalMode() && shortNameSaved[p['id']]) {
                <div class="code-section">
                  <div class="code-label">
                    <mat-icon>link</mat-icon>
                    <strong>{{ 'properties.booking_link' | translate }}</strong>
                  </div>
                  <div class="booking-url-row">
                    <code class="booking-url-code">{{ bookingUrl(p['id']) }}</code>
                    <button mat-icon-button (click)="copyBookingUrl(p['id'])"
                            [matTooltip]="'common.copy' | translate">
                      <mat-icon>content_copy</mat-icon>
                    </button>
                  </div>
                </div>
                <mat-divider class="divider"></mat-divider>
              }

              <!-- Photo de couverture (site de réservation public) — masqué en mode iCal -->
              @if (!isIcalMode()) {
                <div class="code-section">
                  <div class="code-label">
                    <mat-icon>photo_camera</mat-icon>
                    <strong>Photo de couverture</strong>
                    @if (isCoverPhotoDirty(p['id'])) {
                      <span class="unsaved-dot" [matTooltip]="'common.unsaved_changes' | translate"></span>
                    }
                  </div>

                  <!-- Bouton scraping automatique -->
                  <div style="margin-bottom:8px">
                    <button mat-stroked-button color="primary"
                            (click)="scrapePhotos(p['id'])"
                            [disabled]="scrapingPhotos[p['id']]"
                            style="font-size:.85rem">
                      @if (scrapingPhotos[p['id']]) {
                        <mat-spinner diameter="16" style="display:inline-block;margin-right:6px"></mat-spinner>
                        Récupération en cours…
                      } @else {
                        <mat-icon style="font-size:18px;vertical-align:middle;margin-right:4px">auto_awesome</mat-icon>
                        Récupérer depuis Beds24
                      }
                    </button>
                  </div>

                  <!-- Mini-galerie des photos trouvées par le scraper -->
                  @if (scrapedPhotos[p['id']]?.length) {
                    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
                      @for (url of (scrapedPhotos[p['id']] ?? []); track url) {
                        <img [src]="url" alt="Photo"
                             (click)="selectScrapedPhoto(p['id'], url)"
                             style="height:72px;width:96px;object-fit:cover;border-radius:6px;cursor:pointer;border:2px solid transparent"
                             [style.border-color]="coverPhotoDraft[p['id']] === url ? '#0288d1' : 'transparent'">
                      }
                    </div>
                  }

                  <!-- Champ URL manuel -->
                  <div class="booking-url-row">
                    <mat-form-field appearance="outline" style="flex:1">
                      <mat-label>URL de la photo</mat-label>
                      <input matInput type="url" placeholder="https://..."
                             [(ngModel)]="coverPhotoDraft[p['id']]">
                    </mat-form-field>
                    <button mat-icon-button color="primary"
                            (click)="saveCoverPhoto(p['id'])"
                            [matTooltip]="'common.save' | translate"
                            [disabled]="!isCoverPhotoDirty(p['id'])">
                      <mat-icon>save</mat-icon>
                    </button>
                  </div>
                  @if (coverPhotoSaved[p['id']]) {
                    <img [src]="coverPhotoSaved[p['id']]" alt="Aperçu actuel"
                         style="max-height:120px;border-radius:8px;margin-top:4px;object-fit:cover;">
                  }
                </div>
                <mat-divider class="divider"></mat-divider>
              }

              <!-- Inventaire & Équipements (masqué en mode iCal) -->
              @if (!isIcalMode()) {
              <div class="inventory-section">
                <div class="inventory-header" (click)="toggleInventory(p['id'])">
                  <mat-icon class="inv-icon">inventory_2</mat-icon>
                  <strong>{{ 'properties.inventory_label' | translate }}</strong>
                  @if (inventoryMap()[p['id']]?.length) {
                    <span class="inv-count">
                      {{ inventoryMap()[p['id']].length }} article{{ inventoryMap()[p['id']].length > 1 ? 's' : '' }}
                    </span>
                  }
                  <mat-icon class="inv-toggle">{{ inventoryOpen()[p['id']] ? 'expand_less' : 'expand_more' }}</mat-icon>
                </div>

                @if (inventoryOpen()[p['id']]) {
                  <!-- Liste des articles groupés par catégorie -->
                  @if (!inventoryLoading()[p['id']] && inventoryMap()[p['id']]?.length) {
                    @for (cat of usedCategories(p['id']); track cat) {
                      <div class="inv-category">
                        <div class="inv-cat-label">
                          <mat-icon>{{ catIcon(cat) }}</mat-icon>{{ catLabel(cat) }}
                        </div>
                        @for (item of itemsByCategory(p['id'], cat); track item.id) {
                          <div class="inv-item">
                            <span class="inv-qty">×{{ item.quantity }}</span>
                            <span class="inv-label">{{ item.label }}</span>
                            @if (item.details) {
                              <span class="inv-details">{{ item.details }}</span>
                            }
                            <button mat-icon-button class="inv-del" (click)="deleteItem(p['id'], item)" [matTooltip]="'common.delete' | translate">
                              <mat-icon>close</mat-icon>
                            </button>
                          </div>
                        }
                      </div>
                    }
                  }
                  @if (inventoryLoading()[p['id']]) {
                    <div class="inv-loading"><mat-spinner diameter="20"/></div>
                  }

                  <!-- Ajout rapide -->
                  <div class="inv-quick-title">{{ 'properties.quick_add' | translate }}</div>
                  <div class="inv-quick-list">
                    @for (s of quickSuggestions(); track s.label + s.details) {
                      <button mat-stroked-button class="inv-quick-btn" (click)="quickAdd(p['id'], s)">
                        + {{ s.label }} @if (s.details) { <span class="inv-q-detail">{{ s.details }}</span> }
                      </button>
                    }
                  </div>

                  <!-- Formulaire ajout personnalisé -->
                  @if (newItemMap()[p['id']]; as ni) {
                    <div class="inv-custom-form">
                      <mat-form-field appearance="outline" class="inv-cat-field">
                        <mat-label>{{ 'common.type' | translate }}</mat-label>
                        <mat-select [(ngModel)]="ni.category">
                          @for (c of categories; track c.value) {
                            <mat-option [value]="c.value">{{ c.label }}</mat-option>
                          }
                        </mat-select>
                      </mat-form-field>
                      <mat-form-field appearance="outline" class="inv-label-field">
                        <mat-label>{{ 'properties.item_label' | translate }}</mat-label>
                        <input matInput [(ngModel)]="ni.label" placeholder="Nom…">
                      </mat-form-field>
                      <mat-form-field appearance="outline" class="inv-detail-field">
                        <mat-label>Détails</mat-label>
                        <input matInput [(ngModel)]="ni.details" placeholder="160x200, 55″…">
                      </mat-form-field>
                      <mat-form-field appearance="outline" class="inv-qty-field">
                        <mat-label>{{ 'properties.item_qty' | translate }}</mat-label>
                        <input matInput type="number" min="1" [(ngModel)]="ni.quantity">
                      </mat-form-field>
                      <button mat-flat-button color="primary" (click)="addItem(p['id'])"
                              [disabled]="!ni.label?.trim()">
                        <mat-icon>add</mat-icon>
                      </button>
                    </div>
                  }
                }
              </div>
              } <!-- fin @if (!isIcalMode()) inventaire -->
            </mat-card-content>

            @if (!isIcalMode() && p['active'] === false) {
              <div class="inactive-banner">
                <mat-icon>pause_circle</mat-icon> {{ 'properties.inactive' | translate }}
              </div>
            }
          </mat-card>
        }
      </div>
    }
  `,
  styles: [`
    .page-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 20px; flex-wrap: wrap; gap: 12px;
    }
    h1 { margin: 0; }
    .search-field { width: 260px; }
    .count { margin: 0 0 16px; font-size: 13px; color: #888; }

    .center { display: flex; justify-content: center; padding: 60px; }
    .empty { display: flex; flex-direction: column; align-items: center; padding: 60px; color: #bbb; }
    .empty mat-icon { font-size: 64px; width: 64px; height: 64px; margin-bottom: 12px; }
    .empty p { font-size: 15px; }

    .props-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 20px;
    }

    .prop-card { display: flex; flex-direction: column; }

    .prop-avatar {
      width: 40px; height: 40px; border-radius: 50%;
      background: #e3f2fd; display: flex; align-items: center; justify-content: center;
    }
    .prop-avatar mat-icon { color: #0288d1; font-size: 22px; width: 22px; height: 22px; }

    .sub { display: flex; align-items: center; flex-wrap: wrap; }
    .sub-icon { font-size: 13px; width: 13px; height: 13px; vertical-align: middle; margin-right: 2px; }

    .info-rows { display: flex; flex-direction: column; gap: 6px; padding: 8px 0 4px; }
    .info-row { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: #555; }
    .info-row mat-icon { font-size: 16px; width: 16px; height: 16px; color: #0288d1; flex-shrink: 0; margin-top: 1px; }
    .prop-id { font-family: monospace; font-size: 12px; color: #aaa; }

    .divider { margin: 12px 0 10px; }

    .code-label {
      display: flex; align-items: center; gap: 6px;
      font-size: 13px; margin-bottom: 8px;
    }
    .code-label mat-icon { font-size: 16px; width: 16px; height: 16px; color: #0288d1; }
    .short-name-badge { font-size: 11px; font-weight: 400; color: #888; margin-left: 8px;
      background: #f5f5f5; padding: 1px 6px; border-radius: 8px; }
    .code-row { display: flex; align-items: center; gap: 6px; }
    .code-input { flex: 1; }

    input.code-masked { -webkit-text-security: disc; letter-spacing: 2px; }

    .unsaved-dot {
      display: inline-block; width: 7px; height: 7px; border-radius: 50%;
      background: #f57c00; margin-left: 6px; vertical-align: middle;
    }

    .prev-code {
      display: flex; align-items: center; gap: 4px;
      font-size: 12px; color: #aaa; margin-top: 2px;
    }
    .prev-code mat-icon { font-size: 13px; width: 13px; height: 13px; }

    .keybox-badge { display: flex; align-items: center; gap: 6px; background: #e3f2fd; border-radius: 6px; padding: 5px 10px; font-size: 12px; margin-bottom: 6px; }
    .keybox-badge mat-icon { font-size: 15px; width: 15px; height: 15px; color: #1976d2; }
    .keybox-badge-name { font-weight: 600; color: #1976d2; }
    .keybox-shared { color: #888; font-size: 11px; }
    .keybox-link-row { display: flex; align-items: center; gap: 8px; margin-top: 4px; flex-wrap: wrap; }
    .keybox-select { flex: 1; min-width: 150px; max-width: 220px; }
    .keybox-create-form { margin-top: 6px; padding: 10px; background: #f9f9f9; border-radius: 6px; border: 1px solid #e0e0e0; }
    .keybox-create-actions { display: flex; gap: 8px; margin-top: 4px; }
    .full-width { width: 100%; }

    .cleaning-section { margin-top: 12px; }
    .cleaning-label {
      display: flex; align-items: center; gap: 6px;
      font-size: 13px; margin-bottom: 8px;
    }
    .cleaning-label mat-icon { font-size: 16px; width: 16px; height: 16px; color: #546e7a; }
    .cleaning-row { display: flex; align-items: center; gap: 6px; }
    .cleaning-input { width: 130px; }
    .pricing-grid { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }

    .occ-banner {
      display: flex; align-items: center; gap: 6px;
      font-size: 12px; font-weight: 600;
      padding: 7px 16px; border-bottom: 1px solid rgba(0,0,0,.06);
      user-select: none;
    }
    .occ-banner:hover { filter: brightness(.97); }
    .occ-icon  { font-size: 16px; width: 16px; height: 16px; flex-shrink: 0; }
    .occ-label { font-weight: 700; }
    .occ-sub   { font-weight: 400; opacity: .85; flex: 1; }
    .occ-arrow { font-size: 16px; width: 16px; height: 16px; margin-left: auto; opacity: .7; }

    .occ-tips {
      padding: 10px 14px 10px 12px;
      border-left: 3px solid #ccc;
      margin: 0 12px 4px;
      background: #fafafa;
      border-radius: 0 4px 4px 0;
      display: flex; flex-direction: column; gap: 6px;
    }
    .tip-row { display: flex; align-items: flex-start; gap: 4px; font-size: 12px; color: #444; }
    .tip-bullet { font-size: 14px; width: 14px; height: 14px; flex-shrink: 0; margin-top: 1px; color: #888; }

    /* Inventaire */
    .inventory-section { margin-top: 12px; }
    .inventory-header { display: flex; align-items: center; gap: 6px; cursor: pointer;
      padding: 4px 0; user-select: none; }
    .inv-icon { font-size: 16px; width: 16px; height: 16px; color: #546e7a; }
    .inventory-header strong { font-size: 13px; flex: 1; }
    .inv-count { font-size: 11px; background: #e3f2fd; color: #0277bd;
      padding: 1px 6px; border-radius: 10px; }
    .inv-toggle { font-size: 18px; width: 18px; height: 18px; color: #aaa; }
    .inv-category { margin: 8px 0 4px; }
    .inv-cat-label { display: flex; align-items: center; gap: 4px;
      font-size: 11px; font-weight: 700; color: #888; text-transform: uppercase;
      letter-spacing: 0.5px; margin-bottom: 4px; }
    .inv-cat-label mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .inv-item { display: flex; align-items: center; gap: 6px; padding: 3px 0;
      font-size: 13px; border-bottom: 1px solid #f5f5f5; }
    .inv-qty { font-weight: 700; color: #546e7a; min-width: 24px; }
    .inv-label { flex: 1; }
    .inv-details { font-size: 12px; color: #888; background: #f5f5f5;
      padding: 1px 6px; border-radius: 6px; }
    .inv-del { width: 24px !important; height: 24px !important; line-height: 24px !important;
      color: #ccc; flex-shrink: 0; }
    .inv-del mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .inv-loading { display: flex; justify-content: center; padding: 8px; }
    .inv-quick-title { font-size: 11px; color: #aaa; margin: 8px 0 4px;
      text-transform: uppercase; letter-spacing: 0.5px; }
    .inv-quick-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
    .inv-quick-btn { font-size: 11px !important; height: 28px !important;
      padding: 0 8px !important; color: #546e7a !important; border-color: #b0bec5 !important; }
    .inv-q-detail { color: #999; margin-left: 2px; }
    .inv-custom-form { display: flex; gap: 6px; align-items: flex-start; flex-wrap: wrap; margin-top: 4px; }
    .inv-cat-field { width: 120px; flex-shrink: 0; }
    .inv-label-field { flex: 2; min-width: 100px; }
    .inv-detail-field { flex: 1; min-width: 80px; }
    .inv-qty-field { width: 60px; flex-shrink: 0; }

    .full-textarea { width: 100%; margin-bottom: 8px; }
    .card-title-icon { font-size: 20px; width: 20px; height: 20px; vertical-align: middle; margin-right: 6px; color: #546e7a; }
    .footer-actions { display: flex; align-items: center; gap: 12px; }
    .footer-saved-hint { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #2e7d32; }
    .footer-saved-hint mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .booking-url-row { display: flex; align-items: center; gap: 6px; }
    .booking-url-code { font-size: 11px; background: #f5f5f5; border: 1px solid #e0e0e0;
      border-radius: 4px; padding: 5px 8px; flex: 1; word-break: break-all; color: #0288d1; }

    .inactive-banner {
      display: flex; align-items: center; gap: 6px;
      background: #fff3e0; color: #e65100; font-size: 12px;
      padding: 8px 16px; border-top: 1px solid #ffe0b2; border-radius: 0 0 4px 4px;
    }
    .inactive-banner mat-icon { font-size: 16px; width: 16px; height: 16px; }

    /* Bundles */
    .bundle-card { margin-bottom: 20px; }
    .bundle-empty { color: #999; font-size: 13px; margin: 4px 0 12px; }
    .bundle-row {
      display: flex; align-items: center; justify-content: space-between;
      gap: 12px; padding: 10px 0; flex-wrap: wrap;
    }
    .bundle-info { display: flex; flex-direction: column; gap: 2px; }
    .bundle-info strong { font-size: 14px; }
    .bundle-sub { font-size: 12px; color: #888; }
    .bundle-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
    .bundle-form {
      display: flex; flex-direction: column; gap: 4px; flex-wrap: wrap;
      margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee;
    }
    .bundle-form mat-form-field { width: 100%; }
    .bundle-horizon-field { max-width: 200px; }
    .bundle-form-actions { display: flex; gap: 8px; margin-top: 4px; }

    /* iCal mode */
    .ical-add-section { margin-bottom: 20px; }
    .add-prop-card { margin-bottom: 20px; }
    .add-prop-form { display: flex; flex-direction: column; gap: 8px; }
    .add-field-name, .add-field-short { flex: 1; }
    .add-field-url { width: 100%; }
    .add-prop-actions { display: flex; gap: 8px; align-items: center; }
    .ical-edit-section { margin: 8px 0; }
    .ical-fields-row { display: flex; gap: 8px; flex-wrap: wrap; }
    .ical-name-field { flex: 2; min-width: 140px; }
    .ical-short-field { flex: 1; min-width: 100px; }
    .ical-prop-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 4px; }
    .ical-export-row { display: flex; align-items: flex-start; gap: 8px; background: #f1f8e9; border: 1px solid #c5e1a5; border-radius: 6px; padding: 8px 10px; margin-bottom: 8px; margin-top: 8px; }
    .ical-export-icon { font-size: 18px; width: 18px; height: 18px; color: #558b2f; flex-shrink: 0; margin-top: 2px; }
    .ical-export-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .ical-export-label { font-size: 11px; font-weight: 600; color: #558b2f; text-transform: uppercase; letter-spacing: 0.5px; }
    .ical-export-url { font-size: 11px; color: #33691e; word-break: break-all; background: none; border: none; padding: 0; }

    /* Sources iCal */
    .ical-sources-section { margin-top: 12px; border: 1px solid #e8eaf6; border-radius: 6px; padding: 10px 12px; background: #f9f9fd; }
    .ical-sources-header { display: flex; align-items: center; gap: 6px; font-size: 13px; margin-bottom: 10px; }
    .src-icon { font-size: 16px; width: 16px; height: 16px; color: #3949ab; }
    .source-row { display: flex; align-items: center; gap: 6px; padding: 5px 0; border-bottom: 1px solid #e8eaf6; }
    .source-row:last-child { border-bottom: none; }
    .source-info { flex: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
    .source-name { font-size: 13px; font-weight: 600; color: #1a237e; }
    .source-meta { font-size: 11px; color: #9e9e9e; }
    .source-actions { display: flex; align-items: center; gap: 0; flex-shrink: 0; }
    .source-add-row, .source-edit-row { display: flex; align-items: flex-start; gap: 6px; flex-wrap: wrap; padding: 6px 0 2px; }
    .src-name-field { width: 130px; flex-shrink: 0; }
    .src-url-field { flex: 1; min-width: 150px; }
    .add-source-btn { margin-top: 6px; font-size: 12px !important; height: 32px !important; color: #3949ab !important; border-color: #9fa8da !important; }

    @media (max-width: 600px) {
      .props-grid { grid-template-columns: 1fr; }
      .search-field { width: 100%; }
    }
  `]
})
export class PropertiesComponent implements OnInit {
  properties     = signal<any[]>([]);
  loading        = signal(false);
  search         = signal('');
  publicSiteSlug = signal('');

  // iCal mode
  isIcalMode    = signal(false);
  icalEditDraft: Record<string, { name: string; shortName: string; origName: string; origShortName: string }> = {};
  icalSyncing:  Record<string, boolean> = {};
  addPropForm   = { name: '', shortName: '' };
  addPropOpen   = signal(false);
  addPropSaving = signal(false);

  // iCal sources
  icalSources:         Record<string, any[]>    = {};
  icalSourceFormOpen:  Record<string, boolean>  = {};
  icalSourceForm:      Record<string, { name: string; url: string }> = {};
  icalSourceSaving:    Record<string, boolean>  = {};
  icalSourceSyncing:   Record<string, boolean>  = {};
  icalSourceEditId:    Record<string, number | null> = {};
  icalSourceEditDraft: Record<string, Record<number, { name: string; url: string }>> = {};

  searchDraft = '';
  tipsOpen:   Record<string, boolean> = {};
  bookings    = signal<any[]>([]);
  shortNameSaved: Record<string, string> = {};
  shortNameDraft: Record<string, string> = {};
  codeSaved:   Record<string, string>  = {};
  codeDraft:   Record<string, string>  = {};
  prevCodes:   Record<string, string>  = {};
  codeVisible: Record<string, boolean> = {};
  keyBoxes = signal<KeyBox[]>([]);
  propKeyBoxId:   Record<string, number | null> = {};
  propKeyBoxName: Record<string, string | null> = {};
  showKeyBoxCreate: Record<string, boolean> = {};
  newKeyBoxNameDraft: Record<string, string> = {};
  cleaningDraft: Record<string, string> = {};
  cleaningSaved: Record<string, string> = {};
  pricingDraft: Record<string, { cleaningFee: string; extraPersonThreshold: string; extraPersonFee: string; discount7Nights: string; discount28Nights: string }> = {};
  pricingSaved: Record<string, { cleaningFee: string; extraPersonThreshold: string; extraPersonFee: string; discount7Nights: string; discount28Nights: string }> = {};
  coverPhotoDraft: Record<string, string> = {};
  coverPhotoSaved: Record<string, string> = {};
  scrapingPhotos: Record<string, boolean> = {};
  scrapedPhotos: Record<string, string[]> = {};

  // ── Bundles de logements ────────────────────────────────────────────
  bundles          = signal<PropertyBundle[]>([]);
  bundleFormOpen   = signal(false);
  savingBundle     = signal(false);
  runningBundleId  = signal<number | null>(null);
  editingBundleId: number | null = null;
  bundleForm: { name: string; bundlePropertyId: string; memberPropertyIds: string[]; enabled: boolean; horizonDays: number } = {
    name: '', bundlePropertyId: '', memberPropertyIds: [], enabled: true, horizonDays: 365
  };

  filtered = computed(() => {
    const q   = this.search().toLowerCase().trim();
    const map = this.occupancyMap();
    const ORDER: Record<string, number> = { urgent: 0, vacant_long: 1, vacant_short: 2, occupied: 3 };

    let list = this.properties();
    if (q) list = list.filter(p =>
      (p['name']    ?? '').toLowerCase().includes(q) ||
      (p['city']    ?? '').toLowerCase().includes(q) ||
      (p['address'] ?? '').toLowerCase().includes(q)
    );

    return [...list].sort((a, b) => {
      const oa = map[String(a['id'])];
      const ob = map[String(b['id'])];
      if (!oa || !ob) return 0;
      const diff = ORDER[oa.type] - ORDER[ob.type];
      if (diff !== 0) return diff;
      const keyCmp = oa.sortKey.localeCompare(ob.sortKey);
      if (keyCmp !== 0) return keyCmp;
      return (a['name'] ?? '').localeCompare(b['name'] ?? '');
    });
  });

  // ── Inventaire ──────────────────────────────────────────────────────
  readonly categories   = INVENTORY_CATEGORIES;
  readonly allQuickItems = QUICK_ITEMS;
  inventoryOpen    = signal<Record<string, boolean>>({});
  inventoryLoading = signal<Record<string, boolean>>({});
  inventoryMap     = signal<Record<string, InventoryItem[]>>({});
  newItemMap       = signal<Record<string, Partial<InventoryItem> & { quantity: number }>>({});

  toggleInventory(propId: string): void {
    const open = !this.inventoryOpen()[propId];
    this.inventoryOpen.update(m => ({ ...m, [propId]: open }));
    if (open && !this.inventoryMap()[propId]) this.loadInventory(propId);
    if (!this.newItemMap()[propId]) {
      this.newItemMap.update(m => ({ ...m, [propId]: { category: 'BEDS', label: '', details: '', quantity: 1 } }));
    }
  }

  private loadInventory(propId: string): void {
    this.inventoryLoading.update(m => ({ ...m, [propId]: true }));
    this.inventoryService.getAll(String(propId)).subscribe({
      next: items => {
        this.inventoryMap.update(m => ({ ...m, [propId]: items }));
        this.inventoryLoading.update(m => ({ ...m, [propId]: false }));
      },
      error: () => {
        this.inventoryMap.update(m => ({ ...m, [propId]: [] }));
        this.inventoryLoading.update(m => ({ ...m, [propId]: false }));
      }
    });
  }

  usedCategories(propId: string): string[] {
    const items = this.inventoryMap()[propId] ?? [];
    return [...new Set(items.map(i => i.category))];
  }

  itemsByCategory(propId: string, cat: string): InventoryItem[] {
    return (this.inventoryMap()[propId] ?? []).filter(i => i.category === cat);
  }

  catLabel(cat: string): string { return this.categories.find(c => c.value === cat)?.label ?? cat; }
  catIcon(cat: string):  string { return this.categories.find(c => c.value === cat)?.icon  ?? 'category'; }

  quickSuggestions(): typeof QUICK_ITEMS { return this.allQuickItems; }

  quickAdd(propId: string, s: { category: string; label: string; details?: string }): void {
    const key      = s.label + (s.details ?? '');
    const existing = (this.inventoryMap()[propId] ?? [])
      .find(i => (i.label + (i.details ?? '')) === key);
    if (existing?.id) {
      this.inventoryService.update(existing.id, { quantity: existing.quantity + 1 }).subscribe(updated => {
        this.inventoryMap.update(m => ({
          ...m, [propId]: (m[propId] ?? []).map(i => i.id === updated.id ? updated : i)
        }));
      });
    } else {
      this.inventoryService.create({
        beds24PropertyId: String(propId), category: s.category,
        label: s.label, details: s.details ?? null, quantity: 1
      }).subscribe(item => {
        this.inventoryMap.update(m => ({ ...m, [propId]: [...(m[propId] ?? []), item] }));
      });
    }
  }

  addItem(propId: string): void {
    const form = this.newItemMap()[propId];
    if (!form?.label?.trim()) return;
    this.inventoryService.create({
      beds24PropertyId: String(propId),
      category: form.category ?? 'OTHER',
      label:    form.label.trim(),
      details:  form.details?.trim() || null,
      quantity: form.quantity ?? 1
    }).subscribe(item => {
      this.inventoryMap.update(m => ({ ...m, [propId]: [...(m[propId] ?? []), item] }));
      this.newItemMap.update(m => ({ ...m, [propId]: { category: form.category, label: '', details: '', quantity: 1 } }));
      this.snackBar.open(this.t.instant('properties.item_equipment_added'), '', { duration: 1500 });
    });
  }

  deleteItem(propId: string, item: InventoryItem): void {
    if (!item.id) return;
    this.inventoryService.delete(item.id).subscribe(() => {
      this.inventoryMap.update(m => ({ ...m, [propId]: (m[propId] ?? []).filter(i => i.id !== item.id) }));
    });
  }

  constructor(
    private http: HttpClient,
    private propConfigService: PropertyConfigService,
    private bookingService: BookingService,
    private auth: AuthService,
    private inventoryService: PropertyInventoryService,
    private userService: UserService,
    private bundleService: PropertyBundleService,
    private snackBar: MatSnackBar,
    private t: TranslateService
  ) {}

  ngOnInit(): void {
    this.isIcalMode.set(this.auth.isIcal());
    this.userService.getProfile().subscribe({ next: p => this.publicSiteSlug.set(p.publicSiteSlug ?? ''), error: () => {} });
    if (!this.isIcalMode()) {
      this.propConfigService.getKeyBoxes().subscribe({ next: kbs => this.keyBoxes.set(kbs), error: () => {} });
    }
    this.loading.set(true);
    const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    forkJoin([
      this.http.get<any[]>(`${environment.apiUrl}/admin/properties`),
      this.propConfigService.getAll(),
      this.http.get<any[]>(`${environment.apiUrl}/admin/bookings`, {
        params: { arrivalFrom: localDateStr(sixMonthsAgo) }
      })
    ]).subscribe({
      next: ([props, cfgs, bookings]) => {
        this.properties.set(props ?? []);
        this.bookings.set(bookings ?? []);
        for (const c of cfgs) {
          this.shortNameSaved[c.beds24PropertyId] = c.shortName ?? '';
          this.shortNameDraft[c.beds24PropertyId] = c.shortName ?? '';
          this.codeSaved[c.beds24PropertyId]     = c.accessCode         ?? '';
          this.codeDraft[c.beds24PropertyId]     = c.accessCode         ?? '';
          this.prevCodes[c.beds24PropertyId]     = c.previousAccessCode ?? '';
          this.propKeyBoxId[c.beds24PropertyId]   = c.keyBoxId   ?? null;
          this.propKeyBoxName[c.beds24PropertyId] = c.keyBoxName ?? null;
          const ch = c.cleaningHours != null ? String(c.cleaningHours) : '';
          this.cleaningSaved[c.beds24PropertyId] = ch;
          this.cleaningDraft[c.beds24PropertyId] = ch;
          const pricing = {
            cleaningFee:          c.cleaningFee != null ? String(c.cleaningFee) : '',
            extraPersonThreshold: c.extraPersonThreshold != null ? String(c.extraPersonThreshold) : '',
            extraPersonFee:       c.extraPersonFee != null ? String(c.extraPersonFee) : '',
            discount7Nights:      c.discount7Nights != null ? String(c.discount7Nights) : '',
            discount28Nights:     c.discount28Nights != null ? String(c.discount28Nights) : ''
          };
          this.pricingSaved[c.beds24PropertyId] = { ...pricing };
          this.pricingDraft[c.beds24PropertyId] = { ...pricing };
          const url = c.coverPhotoUrl ?? '';
          this.coverPhotoSaved[c.beds24PropertyId] = url;
          this.coverPhotoDraft[c.beds24PropertyId] = url;
          if (c.photoUrls?.length) this.scrapedPhotos[c.beds24PropertyId] = c.photoUrls;
        }
        for (const p of props ?? []) {
          const id = String(p['id']);
          if (!this.pricingDraft[id]) {
            const empty = { cleaningFee: '', extraPersonThreshold: '', extraPersonFee: '', discount7Nights: '', discount28Nights: '' };
            this.pricingDraft[id] = { ...empty };
            this.pricingSaved[id] = { ...empty };
          }
          if (this.isIcalMode()) {
            this.icalEditDraft[id] = {
              name: p['name'] ?? '',
              shortName: p['shortName'] ?? '',
              origName: p['name'] ?? '',
              origShortName: p['shortName'] ?? ''
            };
            this.loadSources(id);
          }
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
    if (!this.isIcalMode()) this.loadBundles();
  }

  occupancyMap = computed((): Record<string, OccupancyStatus> => {
    const today   = localDateStr();
    const todayMs = new Date(today + 'T00:00:00').getTime();
    const active  = new Set(['new', 'confirmed', 'request', 'inquiry']);
    const daysDiff = (iso: string) =>
      Math.round((new Date(iso + 'T00:00:00').getTime() - todayMs) / 86400000);
    const fmt = (iso: string) =>
      new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    const map: Record<string, OccupancyStatus> = {};

    const normId = (v: any): string => {
      if (v == null) return '';
      const n = Number(v);
      return isNaN(n) ? String(v) : String(Math.floor(n));
    };

    for (const p of this.properties()) {
      const id = normId(p['id']);
      const rel = this.bookings().filter(b => {
        const s = (b['status'] ?? '').toLowerCase();
        const bId = normId(b['propId'] ?? b['propertyId']);
        return active.has(s) && bId === id;
      });

      const d10 = (s: string) => (s ?? '').substring(0, 10);
      // Fix 1 : inclure le jour de départ (>= au lieu de >)
      // current = séjour qui couvre aujourd'hui avec l'arrivée la plus ancienne
      // (si départ aujourd'hui + arrivée aujourd'hui coexistent, on prend celui qui part)
      const current = rel
        .filter(b => d10(b['arrival']) <= today && d10(b['departure']) >= today)
        .sort((a, b) => d10(a['arrival']).localeCompare(d10(b['arrival'])))[0] ?? null;

      // nextBook : première réservation après l'arrivée de current
      const nextBook = rel
        .filter(b => d10(b['arrival']) > d10(current ? current['arrival'] : today))
        .sort((a, b) => d10(a['arrival']).localeCompare(d10(b['arrival'])))[0] ?? null;

      const depDays = current  ? daysDiff(d10(current['departure'])) : null;
      const arrDays = nextBook ? daysDiff(d10(nextBook['arrival']))   : null;

      const gName = (b: any) => {
        const f = (b['guestFirstName'] || b['firstName'] || '').trim().toLowerCase();
        const l = (b['guestLastName']  || b['lastName']  || '').trim().toLowerCase();
        return (f + ' ' + l).trim();
      };

      // ── Vert : même voyageur checkout + checkin aujourd'hui (prolongation) ──
      if (depDays === 0 && arrDays === 0 && current && nextBook) {
        const n1 = gName(current), n2 = gName(nextBook);
        if (n1 && n2 && n1 === n2) {
          const nextDep = d10(nextBook['departure']);
          const depLabel = daysDiff(nextDep) > 0
            ? this.t.instant('properties.occ_dep_in_days', { n: daysDiff(nextDep), date: fmt(nextDep) })
            : this.t.instant('properties.occ_dep_on', { date: fmt(nextDep) });
          map[id] = { type: 'occupied', label: this.t.instant('properties.occ_occupied'), sublabel: depLabel,
            color: '#1b5e20', bg: '#e8f5e9', icon: 'check_circle',
            sortKey: '3_' + nextDep,
            tips: [this.t.instant('properties.occ_same_guest_extends'),
                   this.t.instant('properties.occ_same_guest_update')] };
          continue;
        }
      }

      // ── Rouge : départ ou arrivée dans <= 1 jour, ou checkin aujourd'hui ──
      const depUrgent    = depDays !== null && depDays <= 1;
      const arrUrgent    = arrDays !== null && arrDays <= 1;
      const checkinToday = current !== null && d10(current['arrival']) === today;
      if (depUrgent || arrUrgent || checkinToday) {
        const depLabel = depDays === 0 ? this.t.instant('properties.occ_dep_today') : this.t.instant('properties.occ_dep_tomorrow');
        const arrLabel = arrDays === 0 ? this.t.instant('properties.occ_arr_today') : this.t.instant('properties.occ_arr_tomorrow');
        let label: string;
        if (checkinToday && !depUrgent && !arrUrgent) {
          label = this.t.instant('properties.occ_arr_today');
        } else {
          label = (depUrgent && arrUrgent) ? (depLabel + ' · ' + arrLabel) : (depUrgent ? depLabel : arrLabel);
        }
        const tips = (depUrgent && arrUrgent)
          ? [this.t.instant('properties.occ_tip_manage_dep_arr'),
             this.t.instant('properties.occ_tip_cleaning_between'),
             this.t.instant('properties.occ_tip_confirm_arr_next')]
          : depUrgent
          ? [this.t.instant('properties.occ_tip_plan_cleaning'),
             this.t.instant('properties.occ_tip_check_property'),
             this.t.instant('properties.occ_tip_update_avail')]
          : [this.t.instant('properties.occ_tip_send_checkin'),
             this.t.instant('properties.occ_tip_check_code'),
             this.t.instant('properties.occ_tip_confirm_arr')];
        const sortRef = depUrgent ? d10(current!['departure']) : (nextBook ? d10(nextBook['arrival']) : today);
        map[id] = { type: 'urgent', label,
          color: '#b71c1c', bg: '#ffebee', icon: 'priority_high',
          sortKey: '0_' + sortRef, tips };
        continue;
      }

      // ── Vert : occupé, départ dans 2+ jours ──
      if (current) {
        const depLabel = depDays !== null && depDays > 0
          ? this.t.instant('properties.occ_dep_in_days', { n: depDays, date: fmt(d10(current['departure'])) })
          : this.t.instant('properties.occ_dep_on', { date: fmt(d10(current['departure'])) });
        map[id] = { type: 'occupied', label: this.t.instant('properties.occ_occupied'),
          sublabel: depLabel,
          color: '#1b5e20', bg: '#e8f5e9', icon: 'check_circle',
          sortKey: '3_' + d10(current['departure']),
          tips: [this.t.instant('properties.occ_tip_ongoing'),
                 this.t.instant('properties.occ_tip_midstay'),
                 this.t.instant('properties.occ_tip_check_prices')],
          };
        continue;
      }

      // ── Orange foncé : libre 15+ jours ──
      if (arrDays === null || arrDays >= 15) {
        const sub = arrDays !== null
          ? this.t.instant('properties.occ_next_arr', { date: fmt(d10(nextBook!['arrival'])) })
          : this.t.instant('properties.occ_no_bookings');
        map[id] = { type: 'vacant_long', label: this.t.instant('properties.occ_vacant_long'),
          sublabel: sub,
          color: '#bf360c', bg: '#fbe9e7', icon: 'trending_down',
          sortKey: '1_' + (arrDays !== null ? d10(nextBook!['arrival']) : '9999'),
          tips: [this.t.instant('properties.occ_tip_lower_rates'),
                 this.t.instant('properties.occ_tip_reduce_minstay'),
                 this.t.instant('properties.occ_tip_boost_visibility'),
                 this.t.instant('properties.occ_tip_check_calendar')],
          };
        continue;
      }

      // ── Orange clair : libre 2-14 jours ──
      const arrFmt = fmt(d10(nextBook!['arrival']));
      map[id] = { type: 'vacant_short',
        label: arrDays === 2
          ? this.t.instant('properties.occ_arr_after_tomorrow')
          : this.t.instant('properties.occ_arr_in_days', { n: arrDays }),
        sublabel: arrFmt,
        color: '#e65100', bg: '#fff3e0', icon: 'event',
        sortKey: '2_' + d10(nextBook!['arrival']),
        tips: [this.t.instant('properties.occ_tip_check_prices_before'),
               this.t.instant('properties.occ_tip_lastminute'),
               this.t.instant('properties.occ_tip_prepare_next')],
        };
    }
    return map;
  });

  toggleTip(id: string): void { this.tipsOpen[id] = !this.tipsOpen[id]; }
  applySearch(): void { this.search.set(this.searchDraft.trim()); }
  clearSearch(): void  { this.searchDraft = ''; this.search.set(''); }

  roomCount(p: any): number {
    if (Array.isArray(p['rooms'])) return p['rooms'].length;
    if (typeof p['numRooms'] === 'number') return p['numRooms'];
    return 0;
  }

  toggleVisible(id: string): void {
    this.codeVisible[id] = !this.codeVisible[id];
  }

  displayName(p: any): string {
    const id = String(p['id'] ?? '');
    return this.shortNameSaved[id] || p['name'] || '';
  }

  idOf(p: any): string {
    return String(p['id'] ?? '');
  }

  // ── Bundles de logements ────────────────────────────────────────────

  private loadBundles(): void {
    this.bundleService.list().subscribe({
      next: bundles => this.bundles.set(bundles ?? []),
      error: () => this.bundles.set([])
    });
  }

  propertyLabel(propId: string): string {
    const p = this.properties().find(p => this.idOf(p) === String(propId));
    return p ? this.displayName(p) : propId;
  }

  memberLabels(b: PropertyBundle): string {
    return b.memberPropertyIds.map(id => this.propertyLabel(id)).join(', ');
  }

  openNewBundleForm(): void {
    this.editingBundleId = null;
    this.bundleForm = { name: '', bundlePropertyId: '', memberPropertyIds: [], enabled: true, horizonDays: 365 };
    this.bundleFormOpen.set(true);
  }

  editBundle(b: PropertyBundle): void {
    this.editingBundleId = b.id ?? null;
    this.bundleForm = {
      name: b.name,
      bundlePropertyId: b.bundlePropertyId,
      memberPropertyIds: [...b.memberPropertyIds],
      enabled: b.enabled,
      horizonDays: b.horizonDays
    };
    this.bundleFormOpen.set(true);
  }

  cancelBundleForm(): void {
    this.bundleFormOpen.set(false);
    this.editingBundleId = null;
  }

  saveBundle(): void {
    if (!this.bundleForm.name.trim() || !this.bundleForm.bundlePropertyId) return;
    if (this.bundleForm.memberPropertyIds.length === 0) {
      this.snackBar.open(this.t.instant('properties.bundle_select_at_least_one_member'), this.t.instant('common.close'), { duration: 3000 });
      return;
    }

    this.savingBundle.set(true);
    const payload = {
      name: this.bundleForm.name.trim(),
      bundlePropertyId: this.bundleForm.bundlePropertyId,
      memberPropertyIds: this.bundleForm.memberPropertyIds,
      enabled: this.bundleForm.enabled,
      horizonDays: this.bundleForm.horizonDays
    };

    const obs = this.editingBundleId
      ? this.bundleService.update(this.editingBundleId, payload)
      : this.bundleService.create(payload);

    obs.subscribe({
      next: () => {
        this.savingBundle.set(false);
        this.bundleFormOpen.set(false);
        this.editingBundleId = null;
        this.snackBar.open(this.t.instant('properties.bundle_saved'), this.t.instant('common.ok'), { duration: 2000 });
        this.loadBundles();
      },
      error: () => {
        this.savingBundle.set(false);
        this.snackBar.open(this.t.instant('properties.bundle_error'), this.t.instant('common.close'), { duration: 3000 });
      }
    });
  }

  deleteBundle(b: PropertyBundle): void {
    if (!b.id || !confirm(this.t.instant('properties.bundle_confirm_delete'))) return;
    this.bundleService.delete(b.id).subscribe({
      next: () => {
        this.snackBar.open(this.t.instant('properties.bundle_deleted'), this.t.instant('common.ok'), { duration: 2000 });
        this.loadBundles();
      },
      error: () => this.snackBar.open(this.t.instant('properties.bundle_error'), this.t.instant('common.close'), { duration: 3000 })
    });
  }

  toggleBundleEnabled(b: PropertyBundle): void {
    if (!b.id) return;
    this.bundleService.update(b.id, {
      name: b.name,
      bundlePropertyId: b.bundlePropertyId,
      memberPropertyIds: b.memberPropertyIds,
      enabled: !b.enabled,
      horizonDays: b.horizonDays
    }).subscribe({
      next: () => this.loadBundles(),
      error: () => this.snackBar.open(this.t.instant('properties.bundle_error'), this.t.instant('common.close'), { duration: 3000 })
    });
  }

  runBundleNow(b: PropertyBundle): void {
    if (!b.id) return;
    this.runningBundleId.set(b.id);
    this.bundleService.runNow(b.id).subscribe({
      next: r => {
        this.runningBundleId.set(null);
        if (r.success) {
          this.snackBar.open(this.t.instant('properties.bundle_run_success', { count: r.propertiesUpdated }), this.t.instant('common.ok'), { duration: 2500 });
        } else {
          this.snackBar.open(r.error ?? this.t.instant('properties.bundle_error'), this.t.instant('common.close'), { duration: 4000 });
        }
        this.loadBundles();
      },
      error: err => {
        this.runningBundleId.set(null);
        this.snackBar.open(err.error?.error ?? this.t.instant('properties.bundle_error'), this.t.instant('common.close'), { duration: 4000 });
      }
    });
  }

  // ── Logements locaux (mode iCal) ────────────────────────────────────

  openAddProp(): void {
    this.addPropForm = { name: '', shortName: '' };
    this.addPropOpen.set(true);
  }

  addLocalProp(): void {
    if (!this.addPropForm.name.trim()) return;
    this.addPropSaving.set(true);
    this.http.post<any>(`${environment.apiUrl}/admin/local-properties`, {
      name: this.addPropForm.name.trim(),
      shortName: this.addPropForm.shortName.trim()
    }).subscribe({
      next: p => {
        const id = String(p['id']);
        this.properties.update(list => [...list, p]);
        this.icalEditDraft[id] = {
          name: p['name'] ?? '',
          shortName: p['shortName'] ?? '',
          origName: p['name'] ?? '',
          origShortName: p['shortName'] ?? ''
        };
        this.icalSources[id] = [];
        const empty = { cleaningFee: '', extraPersonThreshold: '', extraPersonFee: '', discount7Nights: '', discount28Nights: '' };
        this.pricingDraft[id] = { ...empty };
        this.pricingSaved[id] = { ...empty };
        this.addPropSaving.set(false);
        this.addPropOpen.set(false);
        this.snackBar.open(this.t.instant('properties.local_prop_added'), '', { duration: 2000 });
      },
      error: () => {
        this.addPropSaving.set(false);
        this.snackBar.open(this.t.instant('common.error'), this.t.instant('common.close'), { duration: 3000 });
      }
    });
  }

  isLocalPropDirty(propId: string): boolean {
    const d = this.icalEditDraft[propId];
    if (!d) return false;
    return d.name !== d.origName || d.shortName !== d.origShortName;
  }

  saveLocalProp(propId: string): void {
    const d = this.icalEditDraft[propId];
    if (!d) return;
    this.http.put<any>(`${environment.apiUrl}/admin/local-properties/${propId}`, {
      name: d.name.trim(),
      shortName: d.shortName.trim()
    }).subscribe({
      next: p => {
        d.origName = p['name'] ?? '';
        d.origShortName = p['shortName'] ?? '';
        d.name = d.origName;
        d.shortName = d.origShortName;
        this.properties.update(list => list.map(pr => String(pr['id']) === propId ? p : pr));
        this.shortNameSaved[propId] = p['shortName'] ?? '';
        this.shortNameDraft[propId] = p['shortName'] ?? '';
        this.bookingService.clearPropsCache();
        this.snackBar.open(this.t.instant('properties.local_prop_saved'), '', { duration: 2000 });
      },
      error: () => this.snackBar.open(this.t.instant('common.error'), this.t.instant('common.close'), { duration: 3000 })
    });
  }

  // ── Sources iCal ──────────────────────────────────────────────────────

  loadSources(propId: string): void {
    this.http.get<any[]>(`${environment.apiUrl}/admin/local-properties/${propId}/ical-sources`).subscribe({
      next: sources => { this.icalSources[propId] = sources ?? []; },
      error: () => { this.icalSources[propId] = []; }
    });
  }

  openSourceForm(propId: string): void {
    this.icalSourceForm[propId] = { name: '', url: '' };
    this.icalSourceFormOpen[propId] = true;
  }

  addSource(propId: string): void {
    const form = this.icalSourceForm[propId];
    if (!form?.name?.trim() || !form?.url?.trim()) return;
    this.icalSourceSaving[propId] = true;
    this.http.post<any>(`${environment.apiUrl}/admin/local-properties/${propId}/ical-sources`, {
      name: form.name.trim(), url: form.url.trim()
    }).subscribe({
      next: src => {
        this.icalSources[propId] = [...(this.icalSources[propId] ?? []), src];
        this.icalSourceFormOpen[propId] = false;
        this.icalSourceSaving[propId] = false;
        this.snackBar.open(this.t.instant('properties.ical_source_added'), '', { duration: 2000 });
      },
      error: err => {
        this.icalSourceSaving[propId] = false;
        this.snackBar.open(err.error?.error ?? this.t.instant('common.error'), this.t.instant('common.close'), { duration: 3000 });
      }
    });
  }

  startEditSource(propId: string, src: any): void {
    if (!this.icalSourceEditDraft[propId]) this.icalSourceEditDraft[propId] = {};
    this.icalSourceEditDraft[propId][src.id] = { name: src.name, url: src.url };
    this.icalSourceEditId[propId] = src.id;
  }

  cancelEditSource(propId: string): void {
    this.icalSourceEditId[propId] = null;
  }

  updateSource(propId: string, srcId: number): void {
    const draft = this.icalSourceEditDraft[propId]?.[srcId];
    if (!draft?.name?.trim() || !draft?.url?.trim()) return;
    this.http.put<any>(`${environment.apiUrl}/admin/local-properties/${propId}/ical-sources/${srcId}`, {
      name: draft.name.trim(), url: draft.url.trim()
    }).subscribe({
      next: updated => {
        this.icalSources[propId] = (this.icalSources[propId] ?? []).map(s => s.id === srcId ? updated : s);
        this.icalSourceEditId[propId] = null;
        this.snackBar.open(this.t.instant('properties.ical_source_saved'), '', { duration: 2000 });
      },
      error: () => this.snackBar.open(this.t.instant('common.error'), this.t.instant('common.close'), { duration: 3000 })
    });
  }

  deleteSource(propId: string, srcId: number): void {
    if (!confirm(this.t.instant('properties.ical_source_delete_confirm'))) return;
    this.http.delete<any>(`${environment.apiUrl}/admin/local-properties/${propId}/ical-sources/${srcId}`).subscribe({
      next: () => {
        this.icalSources[propId] = (this.icalSources[propId] ?? []).filter(s => s.id !== srcId);
        this.snackBar.open(this.t.instant('properties.ical_source_deleted'), '', { duration: 2000 });
      },
      error: () => this.snackBar.open(this.t.instant('common.error'), this.t.instant('common.close'), { duration: 3000 })
    });
  }

  syncSource(propId: string, srcId: number): void {
    if (!this.icalSourceSyncing[propId]) this.icalSourceSyncing[propId] = false;
    const key = `${propId}_${srcId}`;
    (this.icalSourceSyncing as any)[key] = true;
    this.http.post<any>(`${environment.apiUrl}/admin/local-properties/${propId}/ical-sources/${srcId}/sync`, {}).subscribe({
      next: r => {
        (this.icalSourceSyncing as any)[key] = false;
        this.loadSources(propId);
        this.snackBar.open(this.t.instant('properties.local_prop_synced') + (r.count != null ? ` (${r.count})` : ''), '', { duration: 2000 });
      },
      error: err => {
        (this.icalSourceSyncing as any)[key] = false;
        this.snackBar.open(err.error?.error ?? this.t.instant('common.error'), this.t.instant('common.close'), { duration: 4000 });
      }
    });
  }

  isSourceSyncing(propId: string, srcId: number): boolean {
    return !!(this.icalSourceSyncing as any)[`${propId}_${srcId}`];
  }

  syncLocalProp(propId: string): void {
    this.icalSyncing[propId] = true;
    this.http.post<any>(`${environment.apiUrl}/admin/local-properties/${propId}/sync`, {}).subscribe({
      next: () => {
        this.icalSyncing[propId] = false;
        this.snackBar.open(this.t.instant('properties.local_prop_synced'), '', { duration: 2000 });
      },
      error: err => {
        this.icalSyncing[propId] = false;
        this.snackBar.open(err.error?.error ?? this.t.instant('common.error'), this.t.instant('common.close'), { duration: 4000 });
      }
    });
  }

  deleteLocalProp(propId: string): void {
    if (!confirm(this.t.instant('properties.local_prop_delete_confirm'))) return;
    this.http.delete<any>(`${environment.apiUrl}/admin/local-properties/${propId}`).subscribe({
      next: () => {
        this.properties.update(list => list.filter(p => String(p['id']) !== propId));
        delete this.icalEditDraft[propId];
        this.snackBar.open(this.t.instant('properties.local_prop_deleted'), '', { duration: 2000 });
      },
      error: () => this.snackBar.open(this.t.instant('common.error'), this.t.instant('common.close'), { duration: 3000 })
    });
  }

  isShortNameDirty(propId: string): boolean {
    return (this.shortNameDraft[propId] ?? '') !== (this.shortNameSaved[propId] ?? '');
  }

  saveShortName(propId: string): void {
    this.propConfigService.updateShortName(String(propId), this.shortNameDraft[propId] ?? '').subscribe({
      next: cfg => {
        this.shortNameSaved[propId] = cfg.shortName ?? '';
        this.shortNameDraft[propId] = cfg.shortName ?? '';
        this.bookingService.clearPropsCache();
        this.snackBar.open(this.t.instant('properties.short_name_saved'), this.t.instant('common.ok'), { duration: 2000 });
      },
      error: () => this.snackBar.open(this.t.instant('common.error'), this.t.instant('common.close'), { duration: 3000 })
    });
  }

  isDirty(propId: string): boolean {
    return (this.codeDraft[propId] ?? '') !== (this.codeSaved[propId] ?? '');
  }

  saveCode(propId: string): void {
    this.propConfigService.updateAccessCode(String(propId), this.codeDraft[propId] ?? '').subscribe({
      next: cfg => {
        this.updateCodeState(propId, cfg);
        if (cfg.keyBoxId) this.keyBoxes.update(kbs => kbs.map(kb => kb.id === cfg.keyBoxId ? { ...kb, accessCode: cfg.accessCode, previousAccessCode: cfg.previousAccessCode } : kb));
        this.snackBar.open(this.t.instant('properties.code_saved'), this.t.instant('common.ok'), { duration: 2000 });
      },
      error: () => this.snackBar.open(this.t.instant('common.error'), this.t.instant('common.close'), { duration: 3000 })
    });
  }

  isCleaningDirty(propId: string): boolean {
    return (this.cleaningDraft[propId] ?? '') !== (this.cleaningSaved[propId] ?? '');
  }

  saveCleaning(propId: string): void {
    this.propConfigService.updateCleaningHours(String(propId), this.cleaningDraft[propId] ?? '').subscribe({
      next: cfg => {
        const v = cfg.cleaningHours != null ? String(cfg.cleaningHours) : '';
        this.cleaningSaved[propId] = v;
        this.cleaningDraft[propId] = v;
        this.snackBar.open(this.t.instant('properties.cleaning_saved'), this.t.instant('common.ok'), { duration: 2000 });
      },
      error: () => this.snackBar.open(this.t.instant('common.error'), this.t.instant('common.close'), { duration: 3000 })
    });
  }

  isPricingDirty(propId: string): boolean {
    const d = this.pricingDraft[propId];
    const s = this.pricingSaved[propId];
    if (!d || !s) return false;
    return d.cleaningFee !== s.cleaningFee || d.extraPersonThreshold !== s.extraPersonThreshold
        || d.extraPersonFee !== s.extraPersonFee || d.discount7Nights !== s.discount7Nights
        || d.discount28Nights !== s.discount28Nights;
  }

  setPricingField(propId: string, field: 'cleaningFee' | 'extraPersonThreshold' | 'extraPersonFee' | 'discount7Nights' | 'discount28Nights', value: string): void {
    if (this.pricingDraft[propId]) {
      this.pricingDraft[propId][field] = value;
    }
  }

  savePricing(propId: string): void {
    const d = this.pricingDraft[propId];
    if (!d) return;
    this.propConfigService.updatePricing(String(propId), d).subscribe({
      next: cfg => {
        const pricing = {
          cleaningFee:          cfg.cleaningFee != null ? String(cfg.cleaningFee) : '',
          extraPersonThreshold: cfg.extraPersonThreshold != null ? String(cfg.extraPersonThreshold) : '',
          extraPersonFee:       cfg.extraPersonFee != null ? String(cfg.extraPersonFee) : '',
          discount7Nights:      cfg.discount7Nights != null ? String(cfg.discount7Nights) : '',
          discount28Nights:     cfg.discount28Nights != null ? String(cfg.discount28Nights) : ''
        };
        this.pricingSaved[propId] = { ...pricing };
        this.pricingDraft[propId] = { ...pricing };
        this.snackBar.open(this.t.instant('properties.pricing_saved'), this.t.instant('common.ok'), { duration: 2000 });
      },
      error: () => this.snackBar.open(this.t.instant('common.error'), this.t.instant('common.close'), { duration: 3000 })
    });
  }

  isCoverPhotoDirty(propId: string): boolean {
    return (this.coverPhotoDraft[propId] ?? '') !== (this.coverPhotoSaved[propId] ?? '');
  }

  scrapePhotos(propId: string): void {
    this.scrapingPhotos[propId] = true;
    this.scrapedPhotos[propId] = [];
    this.propConfigService.scrapePhotos(String(propId)).subscribe({
      next: res => {
        this.scrapingPhotos[propId] = false;
        const photos = res.photos ?? [];
        this.scrapedPhotos[propId] = photos;
        if (photos.length > 0) {
          this.coverPhotoDraft[propId] = photos[0];
          this.snackBar.open(`${photos.length} photo(s) trouvée(s) — sélectionnez-en une et sauvegardez`, 'OK', { duration: 4000 });
        } else {
          this.snackBar.open('Aucune photo trouvée automatiquement — ajoutez l\'URL manuellement', 'OK', { duration: 4000 });
        }
      },
      error: () => {
        this.scrapingPhotos[propId] = false;
        this.snackBar.open('Erreur lors de la récupération des photos', this.t.instant('common.close'), { duration: 3000 });
      }
    });
  }

  selectScrapedPhoto(propId: string, url: string): void {
    this.coverPhotoDraft[propId] = url;
  }

  saveCoverPhoto(propId: string): void {
    const url = this.coverPhotoDraft[propId] ?? '';
    this.propConfigService.updateCoverPhoto(String(propId), url).subscribe({
      next: () => {
        this.coverPhotoSaved[propId] = url;
        this.snackBar.open(this.t.instant('common.saved'), this.t.instant('common.ok'), { duration: 2000 });
      },
      error: () => this.snackBar.open(this.t.instant('common.error'), this.t.instant('common.close'), { duration: 3000 })
    });
  }

  slugify(text: string): string {
    return text.normalize('NFD').replace(/\p{M}/gu, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  bookingUrl(propId: string): string {
    const sn = this.shortNameSaved[propId];
    if (!sn || !this.publicSiteSlug()) return '';
    return `${window.location.origin}/${this.publicSiteSlug()}/${this.slugify(sn)}`;
  }

  copyBookingUrl(propId: string): void {
    const url = this.bookingUrl(propId);
    if (!url) return;
    navigator.clipboard.writeText(url).then(() =>
      this.snackBar.open(this.t.instant('settings.url_copied'), '', { duration: 2000 })
    );
  }

  regenerateCode(propId: string): void {
    this.propConfigService.regenerate(String(propId)).subscribe({
      next: cfg => {
        this.updateCodeState(propId, cfg);
        this.snackBar.open(`${this.t.instant('properties.new_code')} : ${cfg.accessCode}`, this.t.instant('common.ok'), { duration: 3000 });
        if (cfg.keyBoxId) this.keyBoxes.update(kbs => kbs.map(kb => kb.id === cfg.keyBoxId ? { ...kb, accessCode: cfg.accessCode, previousAccessCode: cfg.previousAccessCode } : kb));
      },
      error: () => this.snackBar.open(this.t.instant('common.error'), this.t.instant('common.close'), { duration: 3000 })
    });
  }

  private updateCodeState(propId: string, cfg: PropertyConfig): void {
    this.codeSaved[propId]     = cfg.accessCode         ?? '';
    this.codeDraft[propId]     = cfg.accessCode         ?? '';
    this.prevCodes[propId]     = cfg.previousAccessCode ?? '';
    this.propKeyBoxId[propId]   = cfg.keyBoxId   ?? null;
    this.propKeyBoxName[propId] = cfg.keyBoxName ?? null;
  }

  linkKeyBox(propId: string, keyBoxId: number): void {
    this.propConfigService.linkKeyBox(propId, keyBoxId).subscribe({
      next: cfg => {
        this.updateCodeState(propId, cfg);
        this.showKeyBoxCreate[propId] = false;
        this.snackBar.open(this.t.instant('properties.key_box_linked'), '', { duration: 2000 });
      },
      error: () => this.snackBar.open(this.t.instant('common.error'), this.t.instant('common.close'), { duration: 3000 })
    });
  }

  unlinkKeyBox(propId: string): void {
    this.propConfigService.unlinkKeyBox(propId).subscribe({
      next: cfg => {
        this.updateCodeState(propId, cfg);
        this.snackBar.open(this.t.instant('properties.key_box_unlinked'), '', { duration: 2000 });
      },
      error: () => this.snackBar.open(this.t.instant('common.error'), this.t.instant('common.close'), { duration: 3000 })
    });
  }

  createAndLinkKeyBox(propId: string): void {
    const name = (this.newKeyBoxNameDraft[propId] ?? '').trim();
    if (!name) return;
    this.propConfigService.createKeyBox(name).subscribe({
      next: kb => {
        this.keyBoxes.update(kbs => [...kbs, kb]);
        this.newKeyBoxNameDraft[propId] = '';
        this.showKeyBoxCreate[propId] = false;
        this.linkKeyBox(propId, kb.id);
      },
      error: () => this.snackBar.open(this.t.instant('common.error'), this.t.instant('common.close'), { duration: 3000 })
    });
  }

  deleteKeyBox(keyBoxId: number): void {
    this.propConfigService.deleteKeyBox(keyBoxId).subscribe({
      next: () => {
        this.keyBoxes.update(kbs => kbs.filter(kb => kb.id !== keyBoxId));
        Object.keys(this.propKeyBoxId).forEach(pid => {
          if (this.propKeyBoxId[pid] === keyBoxId) {
            this.propKeyBoxId[pid] = null;
            this.propKeyBoxName[pid] = null;
          }
        });
        this.snackBar.open(this.t.instant('properties.key_box_deleted'), '', { duration: 2000 });
      },
      error: () => this.snackBar.open(this.t.instant('common.error'), this.t.instant('common.close'), { duration: 3000 })
    });
  }

  keyBoxSharedCount(propId: string): number {
    const kbId = this.propKeyBoxId[propId];
    if (!kbId) return 0;
    return Object.values(this.propKeyBoxId).filter(id => id === kbId).length;
  }

  icalExportUrl(token: string): string {
    const base = environment.apiUrl.startsWith('http')
      ? environment.apiUrl
      : `${window.location.origin}${environment.apiUrl}`;
    return `${base}/public/ical/${token}.ics`;
  }

  copyIcalFeedUrl(token: string): void {
    const url = this.icalExportUrl(token);
    navigator.clipboard.writeText(url).then(() =>
      this.snackBar.open(this.t.instant('properties.ical_export_copied'), '', { duration: 2000 })
    );
  }

  openCreateKeyBox(propId: string): void {
    this.newKeyBoxNameDraft[propId] = '';
    this.showKeyBoxCreate[propId] = true;
  }
}
