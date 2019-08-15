/* eslint-disable react/forbid-foreign-prop-types */

import React from 'react';
import PropTypes from 'prop-types';
import hoistNonReactStatics from 'hoist-non-react-statics';
import withDirection, { withDirectionPropTypes, DIRECTIONS } from 'react-with-direction';
import getComponentName from 'airbnb-prop-types/build/helpers/getComponentName';

import useStylesInterface from './useStylesInterface';
import useStylesTheme from './useStylesTheme';
import useThemedStyleSheet from './useThemedStyleSheet';
import { perfStart, perfEnd } from './perf';

export const withStylesPropTypes = {
  styles: PropTypes.object.isRequired,
  theme: PropTypes.object.isRequired,
  css: PropTypes.func.isRequired,
  ...withDirectionPropTypes,
};

export const withStylesDefaultProps = {
  direction: DIRECTIONS.LTR,
};

const EMPTY_STYLES = {};
const EMPTY_STYLES_FN = () => EMPTY_STYLES;

const CREATE_START_MARK = 'react-with-styles.createStyles.start';
const CREATE_END_MARK = 'react-with-styles.createStyles.end';
const createMeasureName = wrappedComponentName => `\ud83d\udc69\u200d\ud83c\udfa8 withStyles(${wrappedComponentName}) [create styles]`;

export function withStyles(
  stylesFn = EMPTY_STYLES_FN,
  {
    stylesPropName = 'styles',
    themePropName = 'theme',
    cssPropName = 'css',
    flushBefore = false,
    pureComponent = false,
  } = {},
) {
  // eslint-disable-next-line no-param-reassign
  stylesFn = stylesFn || EMPTY_STYLES_FN;

  return function withStylesHOC(WrappedComponent) {
    const wrappedComponentName = getComponentName(WrappedComponent);

    function WithStyles(props) {
      // Use global state
      const { direction } = props;
      const stylesInterface = useStylesInterface();
      const stylesTheme = useStylesTheme();

      // Create and cache the ThemedStyleSheet for this combination of global state values. We are
      // going to be using the functions provided by this interface to inject the withStyles props.
      // See `useThemedStyleSheet` for more details.
      const { create, resolve: css, flush } = useThemedStyleSheet({
        direction,
        stylesInterface,
        stylesTheme,
      });

      // Flush styles to the style tag if needed. This must happen as early as possible in the
      // render cycle.
      if (flushBefore) {
        flush();
      }

      if (process.env.NODE_ENV !== 'production') {
        perfStart(CREATE_START_MARK);
      }

      // Create the styles from the stylesFn or retrieved the cached value.
      // See `useThemedStyleSheet` for more details.
      const styles = create(stylesFn);

      if (process.env.NODE_ENV !== 'production') {
        perfEnd(CREATE_START_MARK, CREATE_END_MARK, createMeasureName(wrappedComponentName));
      }

      return (
        <WrappedComponent
          {...props}
          {...{
            [themePropName]: stylesTheme,
            [stylesPropName]: styles,
            [cssPropName]: css,
          }}
        />
      );
    }

    // Listen to directional updates via props
    // eslint-disable-next-line no-func-assign
    WithStyles = withDirection(WithStyles);

    // Copy React statics on WithStyles
    if (WrappedComponent.propTypes) {
      WithStyles.propTypes = { ...WrappedComponent.propTypes };
      delete WithStyles.propTypes[stylesPropName];
      delete WithStyles.propTypes[themePropName];
      delete WithStyles.propTypes[cssPropName];
    }
    if (WrappedComponent.defaultProps) {
      WithStyles.defaultProps = {
        ...withStylesDefaultProps,
        ...WrappedComponent.defaultProps,
      };
    }

    WithStyles.WrappedComponent = WrappedComponent;
    WithStyles.displayName = `withStyles(${wrappedComponentName})`;
    // eslint-disable-next-line no-func-assign
    WithStyles = hoistNonReactStatics(WithStyles, WrappedComponent);

    // Make into a pure functional component if requested
    if (pureComponent) {
      // eslint-disable-next-line no-func-assign
      WithStyles = React.memo(WithStyles);

      // We set statics on the memoized component as well because the
      // React.memo HOC doesn't copy them over
      WithStyles.WrappedComponent = WrappedComponent;
      WithStyles.displayName = `withStyles(${wrappedComponentName})`;
      // eslint-disable-next-line no-func-assign
      WithStyles = hoistNonReactStatics(WithStyles, WrappedComponent);
    }

    return WithStyles;
  };
}

export default withStyles;
