import Component from ".";
import Sheet from "../sheet";



export default class Repeater extends Component {

    constructor(raw: LetsRole.Component, sheet: Sheet, realId: string) {
        super(raw, sheet, realId);
        this.lreType("repeater");
    }
}