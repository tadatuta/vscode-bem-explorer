# BEM Explorer

View all the files of a BEM block from all the levels.

## Configuration

Put `.bemrc` in the root of your project.
The following optional fields may be set:

```js
module.exports = {
    root: true,
    modules: {
        'vscode-bem-explorer': {
            // list of levels to search blocks
            getLevels: function() {
                return [
                    'node_modules/bem-core/common.blocks',
                    'node_modules/bem-core/desktop.blocks',
                    'node_modules/bem-components/common.blocks',
                    'node_modules/bem-components/desktop.blocks',
                    'node_modules/bem-components/design/common.blocks',
                    'node_modules/bem-components/design/desktop.blocks',
                    'common.blocks',
                    'desktop.blocks'
                ];
            },
            filterLevels: function(level) {
                return true;
            },
            filterEntities: function(entity) {
                return true;
            },
            // is used inside getCaption()
            getLevelCaption: function(level) {
                return level
                    .replace('.blocks', '')
                    .replace('node_modules', '');
            },
            // is used inside getCaption()
            getEntityCaption: function(bemCell) {
                return bemCell.entity.toString()
                    .replace(bemCell.entity.block, '');
            },
            getCaption: function(bemCell, levelFullPath) {
                return this.getEntityCaption(bemCell) + '@' + this.getLevelCaption(levelFullPath) + '.' + bemCell.tech;
            }
        }
    }
};
```

## Running the extention

Currently, this API is only available in [Insiders](https://code.visualstudio.com/insiders).

- Download Insiders version of VS Code and open this sample
- `npm install`
- `npm run compile`
- `F5` to start debugging
