import requests
import json

def check_review_schema():
    """Check the review service GraphQL schema"""
    print("Checking review service schema...")
    
    # Query the schema
    query = """
    {
      __schema {
        queryType {
          name
          fields {
            name
          }
        }
        mutationType {
          name
          fields {
            name
            args {
              name
              type {
                kind
                name
                ofType {
                  name
                  kind
                }
              }
            }
          }
        }
      }
    }
    """
    
    try:
        response = requests.post(
            "http://localhost:3000/graphql",
            json={"query": query},
            headers={"Content-Type": "application/json"}
        )
        
        data = response.json()
        print("Review service schema:")
        print(json.dumps(data, indent=2))
        
        # Extract mutation names
        if data.get("data") and data["data"].get("__schema") and data["data"]["__schema"].get("mutationType"):
            mutations = data["data"]["__schema"]["mutationType"]["fields"]
            print("\nAvailable mutations:")
            for mutation in mutations:
                print(f"- {mutation['name']}")
                args = mutation.get("args", [])
                if args:
                    print("  Arguments:")
                    for arg in args:
                        arg_type = arg.get("type", {})
                        type_name = arg_type.get("name")
                        if not type_name and arg_type.get("ofType"):
                            type_name = arg_type["ofType"].get("name")
                        print(f"    - {arg['name']}: {type_name}")
        
    except Exception as e:
        print(f"Error checking review service schema: {str(e)}")

if __name__ == "__main__":
    check_review_schema()
