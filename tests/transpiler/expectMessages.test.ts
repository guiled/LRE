import { formatExpectFailureMessage } from "./expectMessages";

describe("formatExpectFailureMessage", () => {
  it("places expected before actual for toBe message templates", () => {
    expect(
      formatExpectFailureMessage("Expected $1 but got $2", false, [true]),
    ).toBe("Expected true but got false");
  });

  it("uses the expected call count for toHaveBeenCalledTimes message templates", () => {
    const fn = () => undefined;

    expect(
      formatExpectFailureMessage(
        "Expected function to be called $1 times but it was not",
        fn,
        [2],
      ),
    ).toBe("Expected function to be called 2 times but it was not");
  });
});
