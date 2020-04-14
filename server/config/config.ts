type Environments = "local" | "prod" | "beta";

declare const __SERVER_ENV__: Environments;
declare const __PORT__: number;

const env = typeof __SERVER_ENV__ !== "undefined" ? __SERVER_ENV__ : "local";
const port = typeof __PORT__ !== "undefined" ? __PORT__ : 5000;

export class Config
{
	public static Environment = env;
	public static Port = port;

	public static get host()
	{
		let host = "https://allbad.cards";

		switch (this.Environment)
		{
			case "local":
				host = "http://jlauer.local:5000";
				break;
			case "beta":
				host = "http://beta.allbad.cards";
				break;
			case "prod":
				host = "https://allbad.cards";
				break;
		}

		return host;
	}
}

