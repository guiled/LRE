import { Component } from "./component";

export class Choice extends Component {
  #priv = {
    id:undefined
  }
  coucou() {
    super.coucou();
  }
  pub = 1;
  constructor(id) {
    super(id);
    console.log('coucou')
    this.#priv.id = id;
    this.pub = this.#priv?.a;
  }
}
