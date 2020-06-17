import {
  Component,
  ComponentBindings,
  JSXComponent,
  Event,
  OneWay,
  Fragment,
} from 'devextreme-generator/component_declaration/common';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from 'preact';
import Page, { PageProps } from './page';

const PAGER_PAGE_SEPARATOR_CLASS = 'dx-separator';
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const viewFunction = ({ pages }: PagesLarge) => {
  const PagesMarkup = pages.map((pageProps) => {
    if (pageProps !== null) {
      const { index = 0, selected, onClick } = pageProps;
      return (
        <Page
          key={index.toString()}
          index={index}
          selected={selected}
          onClick={onClick}
        />
      );
    }
    return (
      <div key="delimiter" className={PAGER_PAGE_SEPARATOR_CLASS}>. . .</div>
    );
  });
  return (<Fragment>{PagesMarkup}</Fragment>);
};

@ComponentBindings()
export class PagesLargeProps {
  @OneWay() maxPagesCount?: number = 10;

  @OneWay() pageCount?: number = 10;

  @OneWay() pageIndex?: number = 0;

  @OneWay() rtlEnabled?: boolean = false;

  @Event() pageIndexChange?: (pageIndex: number) => void = () => { }; // commonUtils.noop
}

const PAGES_LIMITER = 4;
type PageType = Partial<PageProps> | null;
type SlidingWindowState = {
  indexesForReuse: number[];
  slidingWindowIndexes: number[];
};

type PageIndexes = (number | null)[];
type DelimiterType = 'none' | 'low' | 'high' | 'both';
function getDelimiterType(
  startIndex: number, slidingWindowSize: number, pageCount: number,
): DelimiterType {
  if (startIndex === 1) {
    return 'high';
  } if (startIndex + slidingWindowSize === pageCount - 1) {
    return 'low';
  }
  return 'both';
}

function createPageIndexesBySlidingWindowIndexes(slidingWindowIndexes: number[], pageCount: number,
  delimiter: DelimiterType): SlidingWindowState & { pageIndexes: PageIndexes } {
  let pageIndexes: PageIndexes = [];
  let possibleIndexes: number[] = [];
  if (delimiter === 'none') {
    pageIndexes = [...slidingWindowIndexes];
  } else if (delimiter === 'both') {
    pageIndexes = [0, null, ...slidingWindowIndexes, null, pageCount - 1];
    possibleIndexes = slidingWindowIndexes.slice(1, -1);
  } else if (delimiter === 'high') {
    pageIndexes = [0, ...slidingWindowIndexes, null, pageCount - 1];
    possibleIndexes = slidingWindowIndexes.slice(0, -1);
  } else if (delimiter === 'low') {
    pageIndexes = [0, null, ...slidingWindowIndexes, pageCount - 1];
    possibleIndexes = slidingWindowIndexes.slice(1);
  }
  return { slidingWindowIndexes, indexesForReuse: possibleIndexes, pageIndexes };
}

function createPageIndexes(startIndex: number, slidingWindowSize: number, pageCount: number,
  delimiter: DelimiterType): ReturnType<typeof createPageIndexesBySlidingWindowIndexes> {
  const slidingWindowIndexes: number[] = [];
  for (let i = 0; i < slidingWindowSize; i += 1) {
    slidingWindowIndexes.push(i + startIndex);
  }
  return createPageIndexesBySlidingWindowIndexes(
    slidingWindowIndexes, pageCount, delimiter,
  );
}

@Component({ defaultOptionRules: null, view: viewFunction })
export default class PagesLarge extends JSXComponent(PagesLargeProps) {
  get pages(): PageType[] {
    const { pageIndex } = this.props as Required<PagesLargeProps>;
    const createPage = (index: number): PageType => ({
      index,
      onClick: () => this.onPageClick(index),
      selected: pageIndex === index,
    } as PageType);
    const rtlPageIndexes = this.props.rtlEnabled
      ? [...this.pageIndexes].reverse() : this.pageIndexes;
    return rtlPageIndexes.map((index): PageType => (index === null ? null : createPage(index)));
  }

  canReuseSlidingWindow(pageIndex = 0): boolean {
    const { indexesForReuse } = this.slidingWindowState;
    return indexesForReuse.indexOf(pageIndex) !== -1;
  }

  generatePageIndexes(): PageIndexes {
    const { pageIndex, pageCount } = this.props as Required<PagesLargeProps>;
    let startIndex = 0;
    let slidingWindowSize = 0;
    let delimiter: DelimiterType = 'none';
    const slidingWindow = this.slidingWindowState.slidingWindowIndexes;
    if (pageIndex === slidingWindow[0]) {
      startIndex = pageIndex - 1;
      slidingWindowSize = PAGES_LIMITER;
      delimiter = getDelimiterType(startIndex, slidingWindowSize, pageCount);
    } else if (pageIndex === slidingWindow[slidingWindow.length - 1]) {
      startIndex = pageIndex + 2 - PAGES_LIMITER;
      slidingWindowSize = PAGES_LIMITER;
      delimiter = getDelimiterType(startIndex, slidingWindowSize, pageCount);
    } else if (pageIndex < PAGES_LIMITER) {
      startIndex = 1;
      slidingWindowSize = PAGES_LIMITER;
      delimiter = getDelimiterType(startIndex, slidingWindowSize, pageCount);
    } else if (pageIndex >= pageCount - PAGES_LIMITER) {
      startIndex = pageCount - PAGES_LIMITER - 1;
      slidingWindowSize = PAGES_LIMITER;
      delimiter = getDelimiterType(startIndex, slidingWindowSize, pageCount);
    } else {
      startIndex = pageIndex - 1;
      slidingWindowSize = PAGES_LIMITER;
      delimiter = getDelimiterType(startIndex, slidingWindowSize, pageCount);
    }
    const {
      pageIndexes,
      ...state
    } = createPageIndexes(startIndex, slidingWindowSize, pageCount, delimiter);
    this.patchState(state);
    return pageIndexes;
  }

  patchState({ slidingWindowIndexes, indexesForReuse }: SlidingWindowState): void {
    this.slidingWindowState.slidingWindowIndexes = slidingWindowIndexes;
    this.slidingWindowState.indexesForReuse = indexesForReuse;
  }

  isSlidingWindowMode(): boolean {
    const { pageCount, maxPagesCount } = this.props as Required<PagesLargeProps>;
    return (pageCount <= PAGES_LIMITER) || (pageCount <= maxPagesCount);
  }

  get pageIndexes(): PageIndexes {
    const { pageCount } = this.props as {pageCount: number};
    if (this.isSlidingWindowMode()) {
      return createPageIndexes(0, pageCount, pageCount, 'none').pageIndexes;
    }
    if (this.canReuseSlidingWindow(this.props.pageIndex)) {
      const { slidingWindowIndexes } = this.slidingWindowState;
      const delimiter = getDelimiterType(
        slidingWindowIndexes[0], PAGES_LIMITER, pageCount,
      );
      return createPageIndexesBySlidingWindowIndexes(
        slidingWindowIndexes, pageCount, delimiter,
      ).pageIndexes;
    }
    return this.generatePageIndexes();
  }

  private slidingWindowState: SlidingWindowState = {
    indexesForReuse: [],
    slidingWindowIndexes: [],
  };

  onPageClick(pageIndex: number): void {
    this.props.pageIndexChange?.(pageIndex);
  }
}
