import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private cache = new Map<string, string>();

  constructor(private http: HttpClient) {}

  translate(text: string, fromLang = 'autodetect', toLang = 'fr'): Observable<string> {
    if (!text?.trim()) return of('');
    const cacheKey = `${fromLang}|${toLang}|${text}`;
    if (this.cache.has(cacheKey)) return of(this.cache.get(cacheKey)!);

    const langpair = fromLang === 'autodetect' ? `autodetect|${toLang}` : `${fromLang}|${toLang}`;
    return this.http.get<any>('https://api.mymemory.translated.net/get', {
      params: { q: text.substring(0, 500), langpair }
    }).pipe(
      map(r => {
        const t = r?.responseData?.translatedText ?? text;
        if (typeof t !== 'string' || t.startsWith('MYMEMORY WARNING') || t.startsWith('QUERY LENGTH')) return text;
        this.cache.set(cacheKey, t);
        return t;
      }),
      catchError(() => of(text))
    );
  }
}
