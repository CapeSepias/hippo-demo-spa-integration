import { AfterViewInit, ChangeDetectorRef, Component, OnInit} from '@angular/core';
import { ContentService } from '../../../content.service';
import { cmsJavascriptInitialization } from '../../../utils/cms-js-overrides';
import { findChildById } from '../../../utils/find-child-by-id';
import {ActivatedRoute, NavigationEnd, Router } from "@angular/router";
import { BloomreachContext } from '../../../types/bloomreach-context.type';
import 'rxjs/add/operator/map';
import {baseUrls} from "../../../env-vars";


@Component({
  selector: 'app-page',
  templateUrl: './page.component.html',
  styleUrls: ['./page.component.css']
})
export class PageComponent implements OnInit, AfterViewInit {
  pageData: any;
  containers: any;
  bloomreachContext: BloomreachContext;
  homeLink: string;
  newsLink: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private contentService: ContentService,
    private changeDetectorRef: ChangeDetectorRef,
  ) { }

  ngOnInit() {
    this.setBloomreachContext();
    this.getContainers();
    // fetch Page Model API when navigated to a PageComponent
    this.router.events
      .subscribe((event) => {
        if (event instanceof NavigationEnd) {
          this.setBloomreachContext();
          this.getContainers();
          // quick fix for parsing HTML comments after load; need to hook into proper on-load event
          setTimeout(() => {
              cmsJavascriptInitialization(window, this);
            },
            500);
        }
      });
  }

  ngAfterViewInit() {
    // quick fix for parsing HTML comments after load; need to hook into proper on-load event
    setTimeout(() => {
      cmsJavascriptInitialization(window, this);
      },
      500);
  }

  setBloomreachContext() {
    this.route.data.subscribe(context => {
      this.bloomreachContext = context as BloomreachContext;
      this.contentService.setBloomreachContext(this.bloomreachContext);
      this.buildNavUrl('');
      this.buildNavUrl('news');
    });
    this.route.url.subscribe(segments => {
      const url = segments.join('/');
      this.bloomreachContext.pathInfo = url;
      this.contentService.setBloomreachContext(this.bloomreachContext);
    });
  }

  getContainers() {
    this.contentService.getPage()
      .subscribe(pageData => {
        this.pageData = pageData;
        if (pageData.containers) {
          this.containers = pageData.containers;
        }
      });
  }

  updateComponent(component, propertiesMap): void {
    // only update when a component changes, when propertiesMap is empty the user has clicked cancel in component settings
    // refresh in that case as an easy workaround
    if (Object.keys(propertiesMap).length === 0) {
      window.location.reload();
    } else {
      if (component && component.metaData && component.metaData.refNS) {
        const componentId = component.metaData.refNS;
        this.contentService.updateComponent(componentId, propertiesMap).subscribe(componentResponse => {
          this.updateComponents(componentId, componentResponse);
          this.changeDetectorRef.detectChanges();
        });
      }
    }
  }

  private updateComponents(componentId, componentResponse) {
    // find the component that needs to be updated in the page structure object using its ID
    const componentToUpdate = findChildById(this.containers, componentId, null, null);
    // API can return empty response when component is deleted
    if (componentResponse && componentToUpdate !== undefined) {
      // API can return either a single component or single container
      if (componentResponse.component) {
        componentToUpdate.parent[componentToUpdate.idx] = componentResponse.component;
      }
    }
  }

  private buildNavUrl(segment: string): string {
    let url: string = '';
    // add api path to URL, and prefix with contextPath and preview-prefix if used
    if (this.bloomreachContext.contextPath) {
      url += '/' + this.bloomreachContext.contextPath;
    }
    if (this.bloomreachContext.preview) {
      url += '/_cmsinternal';
    }
    url += '/' + segment;
    console.log(url);
    return url;
  }


}
