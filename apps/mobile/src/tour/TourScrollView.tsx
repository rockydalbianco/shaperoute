import { Component } from "react";
import { ScrollView, type ScrollViewProps } from "react-native";

import { TourScroll, TourScrollContext } from "./tourParts";

/**
 * A `ScrollView` whose parts the tour of the first opening can scroll to
 * (TASK-266): it keeps itself and how far it is scrolled for them. A class,
 * so the scroll it keeps is made once and read only by the tour, after the
 * screen is drawn.
 */
export class TourScrollView extends Component<ScrollViewProps> {
  private readonly scroll = new TourScroll();

  render() {
    const { children, ...props } = this.props;
    return (
      <ScrollView
        {...props}
        ref={this.scroll.hold}
        onScroll={this.scroll.onScroll}
        scrollEventThrottle={16}
      >
        <TourScrollContext.Provider value={this.scroll}>
          {children}
        </TourScrollContext.Provider>
      </ScrollView>
    );
  }
}
